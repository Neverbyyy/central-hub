/** Русское множественное число: plural(5, ['ключ', 'ключа', 'ключей']) → 'ключей'. */
export function plural(count: number, [one, few, many]: [string, string, string]): string {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

/** «1 ключ», «3 ключа», «2722 ключа» — счётчик ключей встречается по всему сервису. */
export const keysCount = (count: number) => `${count} ${plural(count, ['ключ', 'ключа', 'ключей'])}`
