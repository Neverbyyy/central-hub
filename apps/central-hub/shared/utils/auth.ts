/**
 * Куда вернуть после входа: только внутренний путь — «//example.com», «/\example.com» и полные адреса не пропускаем.
 * Одна проверка для сервера (/api/auth/google) и страницы входа.
 */
export const internalPath = (value: unknown): string =>
  typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\') ? value : '/'

/** Имя при входе по общему паролю — им подписываются правки: пробелы по краям и подряд не в счёт. */
export const cleanLoginName = (value: string) => value.trim().replace(/\s+/g, ' ')

/** Что не так с именем для входа по паролю, или null: 2–40 символов — одно правило для сервера и страницы входа. */
export function loginNameError(value: string): string | null {
  const length = cleanLoginName(value).length
  if (!length) return 'Введите имя — им подписываются правки в истории'
  return length < 2 || length > 40 ? 'Имя — от 2 до 40 символов' : null
}
