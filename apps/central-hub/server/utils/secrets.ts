import { createHash, timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'

const digest = (value: string) => createHash('sha256').update(value).digest()

/** Сравнение секретов: хеши одинаковой длины — время ответа не подсказывает, сколько символов совпало. */
export const secretsEqual = (a: string, b: string) => timingSafeEqual(digest(a), digest(b))

// У CLI и нейросети свои токены: утечка одного не открывает другой
const TOKENS = {
  cli: { config: 'cliToken', env: 'NUXT_CLI_TOKEN', label: 'CLI' },
  mcp: { config: 'mcpToken', env: 'NUXT_MCP_TOKEN', label: 'MCP' }
} as const

/** Bearer-токен для /api/cli/* и /mcp — эти маршруты работают без сессии, только с ним. */
export function requireToken(event: H3Event, kind: keyof typeof TOKENS) {
  const { config, env, label } = TOKENS[kind]
  const expected = useRuntimeConfig(event)[config] as string
  if (!expected) {
    throw createError({ statusCode: 503, statusMessage: `${label} Disabled`, message: `${env} не задан на сервере` })
  }
  const header = getHeader(event, 'authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : ''
  if (!token || !secretsEqual(token, expected)) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized', message: `Неверный токен ${label}` })
  }
}
