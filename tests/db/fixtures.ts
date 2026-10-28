import { readFileSync } from 'node:fs'

// Копии файлов локалей InApp и Pages Hub (fixtures/legacy) — из них тестовая база
// получает настоящие строки проектов, а тест выгрузки сверяет результат байт в байт.
export const IMPORTER = 'Импорт копий fixtures/legacy (автотест)'

export const LANGS = ['en', 'ru', 'de', 'es', 'it', 'pt', 'fr', 'sv', 'nl']

export const SETS = {
  inapp: {
    dir: 'fixtures/legacy/inapp/src/locales',
    path: (lang: string) => `src/locales/${lang}.json`,
    commit: '021d14d258e729ccdaf633624c60a49c38115fc8',
    keys: 2696
  },
  pages_hub: {
    dir: 'fixtures/legacy/pages-hub/i18n/locales',
    path: (lang: string) => `i18n/locales/${lang}.json`,
    commit: '99c58185c70e631f2d8f7e9ba1d197c6899ad95f',
    keys: 25
  }
}

export const readFixtures = (dir: string) =>
  Object.fromEntries(LANGS.map(lang => [lang, readFileSync(`${dir}/${lang}.json`, 'utf8')]))
