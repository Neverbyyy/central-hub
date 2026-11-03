/**
 * Множественное число для vue-i18n (опция pluralRules): формы в ключе через «|», как в сервисе.
 * Русскому нужно три формы — «3 дня бесплатно | …»: 1 день, 2–4 дня, 5 дней. Остальным 9 языкам хватает
 * правила vue-i18n по умолчанию (одна форма для 1, другая — для остальных).
 */
export const pluralRules: Record<string, (choice: number, choicesLength: number) => number> = {
  ru: (choice, choicesLength) => {
    if (choicesLength < 3) return choice === 1 ? 0 : 1
    const n = Math.abs(choice) % 100
    const last = n % 10
    if (n > 10 && n < 20) return 2
    if (last === 1) return 0
    if (last >= 2 && last <= 4) return 1
    return 2
  }
}
