/** Ошибка, которую показываем человеку или нейросети как есть; status — HTTP-код для маршрутов. */
export class HubError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message)
  }
}

/** Текст ошибки из любого источника: HubError, ошибка Postgres через PostgREST, обычная Error. */
export function errorText(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message
  return String(error)
}
