// Копии файлов локалей InApp и Pages Hub (fixtures/legacy) — из них тестовая база
// получает настоящие строки проектов, а тест выгрузки сверяет результат байт в байт.
export { LANGS, readFixtures } from '../fixtures'

export const IMPORTER = 'Импорт копий fixtures/legacy (автотест)'

export const SETS = {
  inapp: {
    path: (lang: string) => `src/locales/${lang}.json`,
    commit: '021d14d258e729ccdaf633624c60a49c38115fc8',
    keys: 2696
  },
  pages_hub: {
    path: (lang: string) => `i18n/locales/${lang}.json`,
    commit: '99c58185c70e631f2d8f7e9ba1d197c6899ad95f',
    keys: 25
  }
}
