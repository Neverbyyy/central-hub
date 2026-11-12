// Вход через Google (OpenID Connect, код авторизации + PKCE). Пароля у сервиса нет: пускаем любой рабочий аккаунт
// Google Workspace компании — списка людей нет. Без Nuxt-глобалов: маршруты /api/auth/google* и тесты.

import { createHash, randomBytes } from 'node:crypto'
import { HubError } from './errors'

const AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const ISSUERS = ['https://accounts.google.com', 'accounts.google.com']

/** Домен компании из настройки: «amayasoft.uz» и «@AmayaSoft.uz» — одно и то же; пусто — null (войти нельзя). */
export function companyDomain(value: string | undefined): string | null {
  return (value ?? '').trim().toLowerCase().replace(/^@/, '') || null
}

export interface GoogleClaims {
  email: string
  emailVerified: boolean
  // Домен Google Workspace; у обычных аккаунтов (gmail.com) его нет
  hd: string | null
  name: string | null
  givenName: string | null
  familyName: string | null
}

/**
 * Пускать ли человека: только аккаунт Google Workspace компании. Сверяется hd из токена — домен Workspace, которому
 * принадлежит аккаунт, а не окончание адреса: обычный gmail или аккаунт Google, заведённый на чужую почту
 * с нашим адресом, hd не получат. Так советует Google.
 */
export function isAllowed(claims: GoogleClaims, domain: string): boolean {
  return claims.emailVerified && claims.hd?.toLowerCase() === domain
}

/** Случайная строка для state и nonce. */
export const randomToken = () => randomBytes(32).toString('base64url')

/** PKCE (RFC 7636): verifier остаётся у сервиса, Google получает только challenge. */
export function pkcePair() {
  const verifier = randomToken()
  return { verifier, challenge: pkceChallenge(verifier) }
}

export const pkceChallenge = (verifier: string) => createHash('sha256').update(verifier).digest('base64url')

/** Адрес, на который уводим человека выбрать аккаунт. hd — только подсказка Google, проверка — в isAllowed. */
export function googleAuthUrl(options: { clientId: string, redirectUri: string, state: string, nonce: string, codeChallenge: string, hd?: string }) {
  const params = new URLSearchParams({
    client_id: options.clientId,
    redirect_uri: options.redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state: options.state,
    nonce: options.nonce,
    code_challenge: options.codeChallenge,
    code_challenge_method: 'S256',
    prompt: 'select_account'
  })
  if (options.hd) params.set('hd', options.hd)
  return `${AUTHORIZE_URL}?${params}`
}

/** Код авторизации → id_token. Сбой Google — HubError без секретов в тексте. */
export async function exchangeCode(options: {
  code: string
  verifier: string
  redirectUri: string
  clientId: string
  clientSecret: string
  fetch?: typeof fetch
}): Promise<string> {
  const response = await (options.fetch ?? fetch)(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', 'accept': 'application/json' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: options.code,
      code_verifier: options.verifier,
      redirect_uri: options.redirectUri,
      client_id: options.clientId,
      client_secret: options.clientSecret
    })
  })
  const body = await response.json().catch(() => ({})) as { id_token?: unknown, error?: unknown }
  if (!response.ok || typeof body.id_token !== 'string') {
    throw new HubError(`Google не выдал вход: ${typeof body.error === 'string' ? body.error : response.status}`, 502)
  }
  return body.id_token
}

/**
 * Утверждения id_token. Подпись не проверяем: токен пришёл напрямую от token endpoint Google по TLS —
 * OpenID Connect Core 3.1.3.7 это допускает. Проверяем издателя, получателя, срок и nonce этого входа.
 */
export function readIdToken(idToken: string, { clientId, nonce, now = Date.now() }: { clientId: string, nonce: string, now?: number }): GoogleClaims {
  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(Buffer.from(idToken.split('.')[1] ?? '', 'base64url').toString('utf8'))
  } catch {
    throw new HubError('Google прислал непонятный ответ', 502)
  }
  const audience = Array.isArray(payload.aud) ? payload.aud : [payload.aud]
  if (!ISSUERS.includes(String(payload.iss))) throw new HubError('Токен выдал не Google', 401)
  if (!audience.includes(clientId)) throw new HubError('Токен выдан другому приложению', 401)
  if (typeof payload.exp !== 'number' || payload.exp * 1000 < now) throw new HubError('Токен входа истёк', 401)
  if (payload.nonce !== nonce) throw new HubError('Токен не от этого входа', 401)
  if (typeof payload.email !== 'string' || !payload.email) throw new HubError('Google не сообщил адрес', 401)

  const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null)
  return {
    email: payload.email,
    emailVerified: payload.email_verified === true || payload.email_verified === 'true',
    hd: text(payload.hd),
    name: text(payload.name),
    givenName: text(payload.given_name),
    familyName: text(payload.family_name)
  }
}

/** Имя для подписи правок и шапки: из профиля Google, без имени — часть адреса до @. Не длиннее 40 символов. */
export function googleName(claims: GoogleClaims): string {
  const name = claims.name ?? ([claims.givenName, claims.familyName].filter(Boolean).join(' ') || claims.email.slice(0, claims.email.indexOf('@')))
  return name.replace(/\s+/g, ' ').slice(0, 40)
}
