/** Текст ошибки для человека: сервер кладёт его в data.message. */
export function errorMessage(error: unknown): string {
  const data = (error as { data?: { message?: unknown } } | null)?.data
  if (typeof data?.message === 'string' && data.message) return data.message
  if (error instanceof Error && error.message) return error.message
  return 'Что-то пошло не так'
}
