import { createHash, timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'

const digest = (value: string) => createHash('sha256').update(value).digest()

/** Сравнение секретов: хеши одинаковой длины — время ответа не подсказывает, сколько символов совпало. */
export const secretsEqual = (a: string, b: string) => timingSafeEqual(digest(a), digest(b))

/** Bearer-токен CLI (NUXT_CLI_TOKEN). Маршруты /api/cli/* работают без сессии, только с ним. */
export function requireCliToken(event: H3Event) {
  const { cliToken } = useRuntimeConfig(event)
  if (!cliToken) {
    throw createError({ statusCode: 503, statusMessage: 'CLI Disabled', message: 'NUXT_CLI_TOKEN не задан на сервере' })
  }
  const header = getHeader(event, 'authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : ''
  if (!token || !secretsEqual(token, cliToken)) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized', message: 'Неверный токен CLI' })
  }
}
