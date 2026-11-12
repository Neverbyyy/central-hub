import type { H3Event, SessionData } from 'h3'

// Вошёл — значит, есть адрес: сессию заполняет только вход через Google (/api/auth/google/callback).
// Cookie прежнего входа паролем ({ authed, name } без адреса) входом больше не считаются
interface HubSession {
  email?: string
  // Имя из профиля Google — подписывает правки в истории, его видят коллеги
  name?: string
}

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
export const useHubSession = (event: H3Event) => sealedSession<HubSession>(event, 'hub', THIRTY_DAYS)

/** Вход через Google в пути: state, nonce, PKCE и next — до возврата от Google. */
export const useOAuthSession = (event: H3Event) => sealedSession<OAuthSession>(event, 'hub-oauth', TEN_MINUTES)

/** Кто вошёл: адрес и имя из Google; не вошёл (или cookie прежнего входа паролем) — null. Одно правило для всех. */
export async function hubUser(event: H3Event): Promise<{ email: string, name: string } | null> {
  const { data } = await useHubSession(event)
  return data.email && data.name ? { email: data.email, name: data.name } : null
}

/** Имя автора правки; без входа — 401. */
export async function requireHubUser(event: H3Event): Promise<string> {
  const user = await hubUser(event)
  if (!user) throw unauthorized()
  return user.name
}

/**
 * Начать сессию после входа через Google: в ней только адрес и имя. clear() в h3 здесь не помог бы — update()
 * перечитывает прежнюю cookie из запроса и дописывает в неё, поэтому прежние поля (другого аккаунта, старого входа
 * паролем) стираем сами.
 */
export async function startHubSession(event: H3Event, user: { email: string, name: string }) {
  const session = await useHubSession(event)
  await session.update((data) => {
    for (const key of Object.keys(data)) Reflect.deleteProperty(data, key)
    return { email: user.email, name: user.name }
  })
}
