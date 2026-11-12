/**
 * Куда вернуть после входа: только внутренний путь — «//example.com», «/\example.com» и полные адреса не пропускаем.
 * Одна проверка для сервера (/api/auth/google) и страницы входа.
 */
export const internalPath = (value: unknown): string =>
  typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\') ? value : '/'
