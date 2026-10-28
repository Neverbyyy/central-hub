import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { exportSet, importSet } from '../../apps/central-hub/server/lib/sync'
import { ACTOR, service } from './clients'

// Импорт копий — это и есть настоящий импорт строк InApp и Pages Hub в сервис:
// первый прогон их заносит, следующие проверяют, что повторный импорт ничего не меняет.
const IMPORTER = 'Импорт копий fixtures/legacy (автотест)'

const LANGS = ['en', 'ru', 'de', 'es', 'it', 'pt', 'fr', 'sv', 'nl']

const SETS = {
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

const readFixtures = (dir: string) =>
  Object.fromEntries(LANGS.map(lang => [lang, readFileSync(`${dir}/${lang}.json`, 'utf8')]))

describe.each(Object.entries(SETS))('набор %s', (name, set) => {
  const files = readFixtures(set.dir)

  it('импорт копий, повторный импорт ничего не меняет', async () => {
    const first = await importSet(service, name, files, { actor: IMPORTER, sourceRef: set.commit })
    expect(first.total).toBe(set.keys)

    const second = await importSet(service, name, files, { actor: IMPORTER, sourceRef: set.commit })
    expect(second).toEqual({ total: set.keys, added: 0, changed: 0, restored: 0, unchanged: set.keys, deprecated: 0 })
  }, 120_000)

  it('выгрузка из базы совпадает с исходными файлами байт в байт', async () => {
    const result = await exportSet(service, name)
    expect(result.files.map(f => f.path)).toEqual(LANGS.map(set.path))
    for (const file of result.files) expect(file.content).toBe(files[file.lang])
  }, 60_000)
})

describe('правка в сервисе', () => {
  const KEY = 'legacy.pages_hub.a.gift_card.common.gift_card_code'
  const setTranslation = (value: string) =>
    service.rpc('set_translation', { p_key: KEY, p_lang: 'de', p_value: value, p_actor: ACTOR, p_source: 'test' })

  it('меняет в выгрузке ровно одну строку одного файла', async () => {
    const before = await exportSet(service, 'pages_hub')
    const { data: row } = await service.from('localizations').select('translations, status').eq('technical_key', KEY).single()
    const original = row!.translations.de as string

    try {
      expect((await setTranslation(`${original} (тест)`)).error).toBeNull()
      const after = await exportSet(service, 'pages_hub')
      expect(after.revision).not.toBe(before.revision)

      for (const file of after.files) {
        const old = before.files.find(f => f.lang === file.lang)!.content.split('\n')
        const now = file.content.split('\n')
        const changed = now.filter((line, i) => line !== old[i])
        expect(now.length).toBe(old.length)
        expect(changed).toEqual(file.lang === 'de' ? [expect.stringContaining('(тест)')] : [])
      }
    } finally {
      await setTranslation(original)
      // Импортированная строка была утверждённой — возвращаем и статус
      await service.from('localizations').update({ status: row!.status }).eq('technical_key', KEY)
    }

    const restored = await exportSet(service, 'pages_hub')
    expect(restored.revision).toBe(before.revision)
  }, 60_000)
})
