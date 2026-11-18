// Языки интерфейса самого сервиса (не путать с 9 языками переводов в базе). По умолчанию — русский.
// Выбор хранится в cookie: сервер рисует страницу и отвечает ошибками сразу на нужном языке
export const HUB_LOCALES = ['ru', 'en', 'uz'] as const
export type HubLocale = typeof HUB_LOCALES[number]
export const DEFAULT_HUB_LOCALE: HubLocale = 'ru'
export const HUB_LOCALE_COOKIE = 'hub-lang'

// Название языка на нём самом — так его узнаёт тот, кто на нём читает
export const HUB_LOCALE_NAMES: Record<HubLocale, string> = { ru: 'Русский', en: 'English', uz: 'O‘zbekcha' }

export const isHubLocale = (value: unknown): value is HubLocale => HUB_LOCALES.includes(value as HubLocale)

// Узбекского в данных Intl браузеров почти нет: Chromium пишет списки русским «и», даты — «11-18 13:20», названий
// языков не знает. Node на сервере знает узбекский целиком, и страница расходилась бы с серверной (ошибка гидрации).
// Поэтому для узбекского — то, что одинаково везде: даты по en-GB (18/11/26, 13:20 — так же, как в узбекском CLDR),
// список — через «va» (joinList), названия языков — своим словарём (app/utils/languageName.ts)

/** Язык для Intl.DateTimeFormat: узбекскому — en-GB, тот же цифровой формат, но есть в любом браузере. */
export const intlLocale = (locale: HubLocale) => (locale === 'uz' ? 'en-GB' : locale)

/** «A», «A и B», «A, B и C» на языке интерфейса; пустая строка — ни одного. */
export function joinList(items: string[], locale: HubLocale): string {
  if (locale !== 'uz') return new Intl.ListFormat(locale, { type: 'conjunction' }).format(items)
  return items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} va ${items[items.length - 1]}`
}
