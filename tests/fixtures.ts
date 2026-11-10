// Копии файлов локалей InApp и Pages Hub (fixtures/legacy) — общие для тестов базы и l10n-core.
// Путь — от этого файла, а не от папки запуска
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export const LANGS = ['en', 'ru', 'de', 'es', 'it', 'pt', 'fr', 'sv', 'nl']

const ROOT = join(import.meta.dirname, '../fixtures/legacy')

// Где лежат локали в копии проекта
export const LEGACY_DIRS = {
  inapp: 'inapp/src/locales',
  pages_hub: 'pages-hub/i18n/locales'
} as const

export type LegacyProject = keyof typeof LEGACY_DIRS

export const readFixture = (project: LegacyProject, lang: string) =>
  readFileSync(join(ROOT, LEGACY_DIRS[project], `${lang}.json`), 'utf8')

/** Все языки проекта: { en: '…содержимое en.json…', … }. */
export const readFixtures = (project: LegacyProject) =>
  Object.fromEntries(LANGS.map(lang => [lang, readFixture(project, lang)]))
