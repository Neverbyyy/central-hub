/** Какая из трёх русских форм: 0 — «1 ключ», 1 — «3 ключа», 2 — «5 ключей». */
export function ruPluralIndex(count: number): 0 | 1 | 2 {
  const mod10 = Math.abs(count) % 10
  const mod100 = Math.abs(count) % 100
  if (mod10 === 1 && mod100 !== 11) return 0
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 1
  return 2
}

/**
 * Множественное число для vue-i18n (словари интерфейса): формы в строке через «|». Русскому — три формы (1 ключ, 3 ключа,
 * 5 ключей), английскому — две (правило vue-i18n по умолчанию), узбекскому — одна: после числа существительное не
 * меняется («3 ta kalit»)
 */
export const hubPluralRules: Record<string, (choice: number, choicesLength: number) => number> = {
  ru: (choice, choicesLength) => (choicesLength < 3 ? (choice === 1 ? 0 : 1) : ruPluralIndex(choice)),
  uz: () => 0
}

/** Перевод по ключу словаря интерфейса — то же, что t из useI18n; утилиты с текстом принимают его параметром. */
export type Translate = (key: string, params?: Record<string, unknown> | number, plural?: number) => string
