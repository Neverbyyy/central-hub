/// <reference types="vite/client" />
// Тексты набора выгрузки ds из сервиса локализации — только утверждённые. Файлы <язык>.json кладёт
// `pnpm l10n pull`, руками их не правят (`pnpm l10n check` это ловит). Формат — вложенный JSON для vue-i18n.
// Тексты попадают в Storybook, пейволлы и лендинги при сборке — сервис во время работы никто не спрашивает

export type Messages = { [key: string]: string | Messages }

// Языки берутся из файлов набора: добавили язык в сервисе — после pull он появится и здесь
const files = import.meta.glob<Messages>('./*.json', { eager: true, import: 'default' })

export const messages: Record<string, Messages> = Object.fromEntries(
  Object.entries(files).map(([path, content]) => [path.slice(2, -'.json'.length), content])
)

export const locales = Object.keys(messages)

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

/** Плоский список «ключ → текст» одного языка: common.button.continue.default → Continue. */
export function flatMessages(tree: Messages = {}, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [name, value] of Object.entries(tree)) {
    const key = prefix ? `${prefix}.${name}` : name
    if (typeof value === 'string') out[key] = value
    else Object.assign(out, flatMessages(value, key))
  }
  return out
}
