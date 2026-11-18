// Название языка перевода (de → «Немецкий» / «German» / «Nemischa») — на языке интерфейса, а не из базы: там
// названия по-русски. Русский и английский — из Intl.DisplayNames (один на язык интерфейса); узбекских названий
// в браузерах нет (shared/utils/hubLocale.ts), поэтому они — здесь, по CLDR
const displayNames = new Map<HubLocale, Intl.DisplayNames>()

const UZ_NAMES: Record<string, string> = {
  en: 'inglizcha',
  ru: 'ruscha',
  de: 'nemischa',
  es: 'ispancha',
  it: 'italyancha',
  pt: 'portugalcha',
  fr: 'fransuzcha',
  sv: 'shvedcha',
  nl: 'niderlandcha',
  uz: 'o‘zbekcha'
}

export function languageName(code: string): string {
  const locale = currentHubLocale()
  let name: string
  if (locale === 'uz') {
    name = UZ_NAMES[code] ?? code.toUpperCase()
  } else {
    let names = displayNames.get(locale)
    if (!names) {
      names = new Intl.DisplayNames(locale, { type: 'language' })
      displayNames.set(locale, names)
    }
    name = names.of(code) ?? code
  }
  return name.charAt(0).toLocaleUpperCase(locale) + name.slice(1)
}
