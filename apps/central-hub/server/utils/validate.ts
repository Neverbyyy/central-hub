export const MAX_KEYS_PER_REQUEST = 500

export const badRequest = (message: string) =>
  createError({ statusCode: 400, statusMessage: 'Bad Request', message })

export const unauthorized = (message = 'Нужен вход') =>
  createError({ statusCode: 401, statusMessage: 'Unauthorized', message })

/** Возможность выключена на этом стенде: не задана переменная окружения или настройка. */
export const disabled = (feature: string, message: string) =>
  createError({ statusCode: 503, statusMessage: `${feature} Disabled`, message })

/** Список ключей из тела запроса: непустые строки, не больше MAX_KEYS_PER_REQUEST. */
export function readKeys(body: unknown): string[] {
  const keys = (body as { keys?: unknown } | null)?.keys
  if (
    !Array.isArray(keys)
    || keys.length === 0
    || keys.length > MAX_KEYS_PER_REQUEST
    || !keys.every(key => typeof key === 'string' && key.length > 0)
  ) {
    throw badRequest(`Нужен список ключей: от 1 до ${MAX_KEYS_PER_REQUEST}`)
  }
  return keys
}
