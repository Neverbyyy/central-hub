import { describe, expect, it } from 'vitest'
import {
  companyDomain,
  exchangeCode,
  googleAuthUrl,
  googleName,
  isAllowed,
  pkceChallenge,
  pkcePair,
  readIdToken,
  type GoogleClaims
} from '../../apps/central-hub/server/lib/google-auth'
import { internalPath } from '../../apps/central-hub/shared/utils/auth'

// Вход через Google (apps/central-hub/server/lib/google-auth.ts): кого пускать, PKCE, адрес Google, id_token.
// Домен в тестах — пример; в сервисе он задан в nuxt.config (authDomain)
const CLIENT = 'client-123.apps.googleusercontent.com'
const NOW = Date.UTC(2026, 10, 12, 12, 0, 0)

const claims = (extra: Partial<GoogleClaims> = {}): GoogleClaims =>
  ({ email: 'anton@amayasoft.com', emailVerified: true, hd: 'amayasoft.com', name: 'Антон Петров', givenName: 'Антон', familyName: 'Петров', ...extra })

// id_token без подписи: проверяется только содержимое — подпись не нужна, токен приходит напрямую от Google
const idToken = (payload: Record<string, unknown>) =>
  ['eyJhbGciOiJSUzI1NiJ9', Buffer.from(JSON.stringify(payload)).toString('base64url'), 'signature'].join('.')
const goodPayload = (extra: Record<string, unknown> = {}) => ({
  iss: 'https://accounts.google.com',
  aud: CLIENT,
  exp: NOW / 1000 + 600,
  nonce: 'nonce-1',
  email: 'Anton@AmayaSoft.com',
  email_verified: true,
  hd: 'amayasoft.com',
  name: 'Антон Петров',
  ...extra
})

describe('кого пускать — рабочие аккаунты домена компании', () => {
  it('домен из настройки: с @ и без, любой регистр; пусто — null', () => {
    expect(companyDomain(' @AmayaSoft.com ')).toBe('amayasoft.com')
    expect(companyDomain('amayasoft.com')).toBe('amayasoft.com')
    expect(companyDomain('')).toBeNull()
    expect(companyDomain(undefined)).toBeNull()
  })

  it('аккаунт Workspace компании (hd) — да, любой человек домена, списка нет', () => {
    expect(isAllowed(claims(), 'amayasoft.com')).toBe(true)
    expect(isAllowed(claims({ email: 'new.person@amayasoft.com', name: 'Новый' }), 'amayasoft.com')).toBe(true)
    // Вторичный домен того же Workspace: адрес другой, hd — основной домен компании
    expect(isAllowed(claims({ email: 'anton@amaya.kids' }), 'amayasoft.com')).toBe(true)
    expect(isAllowed(claims({ hd: 'AmayaSoft.com' }), 'amayasoft.com')).toBe(true)
  })

  it('обычный gmail, чужой Workspace и аккаунт Google на наш адрес без Workspace — нет', () => {
    expect(isAllowed(claims({ email: 'someone@gmail.com', hd: null }), 'amayasoft.com')).toBe(false)
    expect(isAllowed(claims({ email: 'anton@evil.com', hd: 'evil.com' }), 'amayasoft.com')).toBe(false)
    expect(isAllowed(claims({ email: 'fake@amayasoft.com', hd: null }), 'amayasoft.com')).toBe(false)
  })

  it('неподтверждённый адрес — нет', () => {
    expect(isAllowed(claims({ emailVerified: false }), 'amayasoft.com')).toBe(false)
  })
})

describe('PKCE и адрес Google', () => {
  it('challenge по RFC 7636 (пример из приложения B)', () => {
    expect(pkceChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM')
    const pair = pkcePair()
    expect(pair.verifier).toMatch(/^[\w-]{43}$/)
    expect(pair.challenge).toBe(pkceChallenge(pair.verifier))
    expect(pkcePair().verifier).not.toBe(pair.verifier)
  })

  it('адрес: свой клиент и возврат, код с PKCE S256, state, nonce, выбор аккаунта; hd — только если передан', () => {
    const url = new URL(googleAuthUrl({ clientId: CLIENT, redirectUri: 'https://hub.test/api/auth/google/callback', state: 's', nonce: 'n', codeChallenge: 'c', hd: 'amayasoft.com' }))
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: CLIENT,
      redirect_uri: 'https://hub.test/api/auth/google/callback',
      response_type: 'code',
      scope: 'openid email profile',
      state: 's',
      nonce: 'n',
      code_challenge: 'c',
      code_challenge_method: 'S256',
      prompt: 'select_account',
      hd: 'amayasoft.com'
    })
    expect(new URL(googleAuthUrl({ clientId: CLIENT, redirectUri: 'x', state: 's', nonce: 'n', codeChallenge: 'c' })).searchParams.has('hd')).toBe(false)
  })
})

describe('id_token', () => {
  it('содержимое этого входа', () => {
    expect(readIdToken(idToken(goodPayload()), { clientId: CLIENT, nonce: 'nonce-1', now: NOW })).toEqual({
      email: 'Anton@AmayaSoft.com', emailVerified: true, hd: 'amayasoft.com', name: 'Антон Петров', givenName: null, familyName: null
    })
    // aud бывает массивом, издатель — и без https://
    expect(readIdToken(idToken(goodPayload({ aud: ['other', CLIENT], iss: 'accounts.google.com' })), { clientId: CLIENT, nonce: 'nonce-1', now: NOW }).email).toBe('Anton@AmayaSoft.com')
  })

  it.each([
    ['чужой издатель', { iss: 'https://evil.example' }, 'не Google'],
    ['другому приложению', { aud: 'other-client' }, 'другому приложению'],
    ['истёк', { exp: NOW / 1000 - 1 }, 'истёк'],
    ['чужой nonce', { nonce: 'nonce-2' }, 'не от этого входа'],
    ['без адреса', { email: undefined }, 'адрес']
  ])('%s — отказ', (_, extra, message) => {
    expect(() => readIdToken(idToken(goodPayload(extra)), { clientId: CLIENT, nonce: 'nonce-1', now: NOW })).toThrow(message)
  })

  it('мусор вместо токена — понятная ошибка', () => {
    expect(() => readIdToken('not-a-token', { clientId: CLIENT, nonce: 'n', now: NOW })).toThrow('непонятный ответ')
  })
})

describe('обмен кода на id_token', () => {
  it('запрос к Google: код, verifier, свой возврат и клиент — в теле, не в адресе', async () => {
    let request: { url: string, body: URLSearchParams } | null = null
    const fakeFetch = (async (url: string, init: { body: URLSearchParams }) => {
      request = { url, body: init.body }
      return new Response(JSON.stringify({ id_token: 'token-from-google' }), { status: 200 })
    }) as unknown as typeof fetch
    const token = await exchangeCode({ code: 'code-1', verifier: 'v', redirectUri: 'https://hub.test/cb', clientId: CLIENT, clientSecret: 'secret', fetch: fakeFetch })
    expect(token).toBe('token-from-google')
    expect(request!.url).toBe('https://oauth2.googleapis.com/token')
    expect(Object.fromEntries(request!.body)).toEqual({
      grant_type: 'authorization_code', code: 'code-1', code_verifier: 'v', redirect_uri: 'https://hub.test/cb', client_id: CLIENT, client_secret: 'secret'
    })
  })

  it('отказ Google — ошибка с его кодом, без секрета', async () => {
    const fakeFetch = (async () => new Response(JSON.stringify({ error: 'invalid_grant', error_description: 'Bad Request' }), { status: 400 })) as unknown as typeof fetch
    const failure = exchangeCode({ code: 'c', verifier: 'v', redirectUri: 'r', clientId: CLIENT, clientSecret: 'very-secret', fetch: fakeFetch })
    await expect(failure).rejects.toThrow('invalid_grant')
    await expect(failure).rejects.not.toThrow('very-secret')
  })
})

describe('куда вернуть после входа', () => {
  it('внутренний путь — как есть, с запросом', () => {
    expect(internalPath('/localizations?prefix=app.')).toBe('/localizations?prefix=app.')
    expect(internalPath('/')).toBe('/')
  })

  it('чужой сайт, полный адрес, не строка — на главную', () => {
    for (const value of ['//evil.com', '/' + String.fromCharCode(92) + 'evil.com', 'https://evil.com', 'evil.com', '', undefined, ['/a'], 42]) {
      expect(internalPath(value)).toBe('/')
    }
  })
})

describe('имя из профиля', () => {
  it('полное имя; без него — имя и фамилия; без них — адрес до @; не длиннее 40', () => {
    expect(googleName(claims())).toBe('Антон Петров')
    expect(googleName(claims({ name: null }))).toBe('Антон Петров')
    expect(googleName(claims({ name: null, givenName: null, familyName: null }))).toBe('anton')
    expect(googleName(claims({ name: `  ${'Очень '.repeat(10)}длинное  ` }))).toHaveLength(40)
  })
})
