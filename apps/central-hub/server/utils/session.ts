import type { H3Event, SessionData } from 'h3'
import { awaitsName, sessionData, sessionUser, type HubSessionData, type SignedInUser } from '../lib/hub-user'

export type { SignedInUser } from '../lib/hub-user'

// Вошёл — через Google (/api/auth/google/callback: адрес и имя из профиля) или по общему паролю
// (/api/auth/password, затем имя — /api/auth/name). Кто вошёл по cookie — sessionUser в server/lib/hub-user.ts

// Вход через Google в пути: проверяется в callback и сразу стирается
interface OAuthSession {
  state?: string
  nonce?: string
  verifier?: string
  // Куда вернуть после входа — только внутренний путь
  next?: string
}

const THIRTY_DAYS = 60 * 60 * 24 * 30
const TEN_MINUTES = 60 * 10

function sessionPassword(event: H3Event) {
  const { sessionPassword } = useRuntimeConfig(event)
  if (!sessionPassword || sessionPassword.length < 32) {
    throw createError({ statusCode: 500, statusMessage: 'Server Misconfigured', message: 'NUXT_SESSION_PASSWORD не задан или короче 32 символов' })
  }
  return sessionPassword
}

// Зашифрованная cookie, недоступная скриптам страницы. sameSite lax: возврат от Google — переход верхнего уровня,
// cookie до него доходит
const sealedSession = <T extends SessionData>(event: H3Event, name: string, maxAge: number) =>
  useSession<T>(event, { name, password: sessionPassword(event), maxAge, cookie: { httpOnly: true, sameSite: 'lax', secure: !import.meta.dev } })

/** Сессия человека в сервисе. Напрямую — только выход; войти — startHubSession, кто вошёл — hubUser. */
export const useHubSession = (event: H3Event) => sealedSession<HubSessionData>(event, 'hub', THIRTY_DAYS)

/** Вход через Google в пути: state, nonce, PKCE и next — до возврата от Google. */
export const useOAuthSession = (event: H3Event) => sealedSession<OAuthSession>(event, 'hub-oauth', TEN_MINUTES)

/** Кто вошёл (Google или общий пароль); не вошёл — null. Одно правило для middleware, API и страниц. */
export async function hubUser(event: H3Event): Promise<SignedInUser | null> {
  const { data } = await useHubSession(event)
  return sessionUser(data)
}

/** Имя автора правки; без входа — 401. */
export async function requireHubUser(event: H3Event): Promise<string> {
  const user = await hubUser(event)
  if (!user) throw unauthorized()
  return user.name
}

/** Кто вошёл и не ждёт ли вход имени (общий пароль верный, имени ещё нет) — для /api/auth/me. */
export async function hubLogin(event: H3Event) {
  const { data } = await useHubSession(event)
  return { user: sessionUser(data), nameRequired: awaitsName(data) }
}

/**
 * Заменить сессию целиком. clear() в h3 здесь не помог бы — update() перечитывает прежнюю cookie из запроса и
 * дописывает в неё, поэтому прежние поля (другого аккаунта, другого способа входа) стираем сами.
 */
async function replaceHubSession(event: H3Event, next: HubSessionData) {
  const session = await useHubSession(event)
  await session.update((data) => {
    for (const key of Object.keys(data)) Reflect.deleteProperty(data, key)
    return next
  })
}

/** Начать сессию после входа: в ней только поля этого входа. */
export const startHubSession = (event: H3Event, user: SignedInUser) => replaceHubSession(event, sessionData(user))

/** Общий пароль верный — сессия ждёт имя: вход завершит шаг «Как вас зовут?» (/api/auth/name). */
export const startPasswordSession = (event: H3Event) => replaceHubSession(event, { via: 'password' })
