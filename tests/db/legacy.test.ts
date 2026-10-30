import { describe, expect, it } from 'vitest'
import { readLocaleFile } from '../../packages/l10n-core/src'
import { exportSet, importSet } from '../../apps/central-hub/server/lib/sync'
import { ACTOR, service } from './clients'
import { IMPORTER, LANGS, readFixtures, SETS } from './fixtures'

// Строки уже занёс global-setup.ts; здесь проверяем, что повторный импорт ничего не меняет
// и что выгрузка возвращает исходные файлы. База тестовая — правки людей тут не пострадают.
describe.each(Object.entries(SETS))('набор %s', (name, set) => {
  const files = readFixtures(set.dir)

  it('импорт копий, повторный импорт ничего не меняет', async () => {
    const first = await importSet(service, name, files, { actor: IMPORTER, sourceRef: set.commit })
    expect(first.total).toBe(set.keys)

    const second = await importSet(service, name, files, { actor: IMPORTER, sourceRef: set.commit })
    expect(second).toEqual({ total: set.keys, added: 0, changed: 0, restored: 0, unchanged: set.keys, deprecated: 0 })
  }, 120_000)

  it('строки проекта выгружаются байт в байт как в исходных файлах', async () => {
    const result = await exportSet(service, name, { legacyOnly: true })
    expect(result.files.map(f => f.path)).toEqual(LANGS.map(set.path))
    for (const file of result.files) expect(file.content).toBe(files[file.lang])
  }, 60_000)

  it('новые ключи только добавляются: старые строки на месте и не изменились', async () => {
    const result = await exportSet(service, name)
    for (const file of result.files) {
      const exported = new Map(readLocaleFile(file.content).map(e => [JSON.stringify(e.path), e.value]))
      const original = readLocaleFile(files[file.lang]!)
      for (const { path, value } of original) expect(exported.get(JSON.stringify(path))).toBe(value)
      // Всё лишнее — новые ключи под разрешёнными префиксами
      const known = new Set(original.map(e => JSON.stringify(e.path)))
      const added = [...exported.keys()].filter(p => !known.has(p)).map(p => (JSON.parse(p) as string[]).join('.'))
      expect(added.every(key => /^(common|app|web|brand|ds|test)\./.test(key))).toBe(true)
      expect(added.some(key => key.startsWith('common.selftest.'))).toBe(false)
    }
  }, 60_000)
})

describe('правка в сервисе', () => {
  const KEY = 'legacy.pages_hub.a.gift_card.common.gift_card_code'
  const setTranslation = (value: string) =>
    service.rpc('set_translation', { p_key: KEY, p_lang: 'de', p_value: value, p_actor: ACTOR, p_source: 'test' })

  it('без утверждения не меняет выгрузку, после — ровно одну строку одного файла', async () => {
    const before = await exportSet(service, 'pages_hub')
    const { data: row } = await service.from('localizations').select('translations, status').eq('technical_key', KEY).single()
    const original = row!.translations.de as string

    try {
      expect((await setTranslation(`${original} (тест)`)).error).toBeNull()
      // Черновик в проект не уходит
      expect((await exportSet(service, 'pages_hub')).revision).toBe(before.revision)

      const approved = await service.rpc('approve_translations', { p_key: KEY, p_langs: ['de'], p_actor: ACTOR })
      expect(approved.error).toBeNull()
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
