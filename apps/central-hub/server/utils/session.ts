import type { H3Event } from 'h3'

interface HubSession {
  authed?: boolean
  // Подписывает правки в истории
  name?: string
}

const THIRTY_DAYS = 60 * 60 * 24 * 30

// Сессия в зашифрованной cookie. Когда появится вход через Google, поменяется только этот файл и login.
export function useHubSession(event: H3Event) {
  const { sessionPassword } = useRuntimeConfig(event)
  if (!sessionPassword || sessionPassword.length < 32) {
    throw createError({ statusCode: 500, statusMessage: 'Server Misconfigured', message: 'NUXT_SESSION_PASSWORD не задан или короче 32 символов' })
  }
  return useSession<HubSession>(event, {
    name: 'hub',
    password: sessionPassword,
    maxAge: THIRTY_DAYS,
    cookie: { httpOnly: true, sameSite: 'lax', secure: !import.meta.dev }
  })
}

/** Имя автора правки. 401 — нет входа, 403 «Name Required» — человек не представился. */
export async function requireHubUser(event: H3Event): Promise<string> {
  const { data } = await useHubSession(event)
  if (!data.authed) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized', message: 'Нужен вход' })
  }
  if (!data.name) {
    throw createError({ statusCode: 403, statusMessage: NAME_REQUIRED, message: 'Представьтесь — имя подписывает правки в истории' })
  }
  return data.name
}

// Отличает «не представился» от остальных 403 — интерфейс по нему отправляет ввести имя
export const NAME_REQUIRED = 'Name Required'
