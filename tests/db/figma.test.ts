import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FigmaGroup, FigmaToken } from '../../packages/l10n-core/src'
import { figmaExport, figmaPluginSections, figmaPluginTexts } from '../../apps/central-hub/server/lib/figma'
import { ACTOR, ANCHOR, ensureAnchor, service } from './clients'

const restore = () => service.rpc('restore_keys', { p_keys: [ANCHOR], p_actor: ACTOR, p_source: 'test' })
const deprecate = () => service.rpc('deprecate_keys', { p_keys: [ANCHOR], p_actor: ACTOR, p_source: 'test' })
const translate = (lang: string, value: string) =>
  service.rpc('set_translation', { p_key: ANCHOR, p_lang: lang, p_value: value, p_actor: ACTOR, p_source: 'test' })

// Имена переменных так, как их покажет Figma: группы через /
const names = (group: FigmaGroup, path: string[] = []): string[] => Object.entries(group).flatMap(([name, node]) =>
  '$value' in node ? [[...path, name].join('/')] : names(node as FigmaGroup, [...path, name]))

const token = (group: FigmaGroup, key: string) =>
  key.split('.').reduce<FigmaGroup | FigmaToken>((node, part) => (node as FigmaGroup)[part]!, group) as FigmaToken

beforeAll(ensureAnchor)
afterAll(deprecate)

describe('выгрузка в Figma', () => {
  it('раздел и его подраздел не дают повторов, в каждом файле все ключи деревом', async () => {
    const { keys, files } = await figmaExport(service, { prefixes: ['legacy.pages_hub.', 'legacy.pages_hub.a.gift_card'] })
    expect(keys).toBe(25)
    for (const file of Object.values(files)) {
      const all = names(file)
      expect(all).toHaveLength(25)
      expect(all.every(name => name.startsWith('legacy/pages_hub/'))).toBe(true)
    }
  })

  it('файлы — выбранные языки в порядке грида, текст своего языка', async () => {
    const { languages, files } = await figmaExport(service, { prefixes: ['legacy.pages_hub.'], languages: ['ru', 'en'] })
    expect(languages).toEqual(['en', 'ru'])
    expect(Object.keys(files)).toEqual(['en', 'ru'])
    const key = 'legacy.pages_hub.a.gift_card.common.gift_card_code'
    expect(token(files.en!, key)).toMatchObject({ $type: 'string', $value: 'Gift Code: {0}' })
    expect(token(files.ru!, key).$value).toBe('Подарочный Код: {0}')
  })

  it('ключ, помеченный устаревшим, в выгрузку не попадает; описание ключа — в $description', async () => {
    await restore()
    const active = await figmaExport(service, { prefixes: ['common.selftest.anchor'] })
    expect(token(active.files.en!, ANCHOR).$description).toContain('Служебный ключ')

    await deprecate()
    const hidden = await figmaExport(service, { prefixes: ['common.selftest.anchor'] })
    expect(hidden.keys).toBe(0)
  })

  it('без разделов и с неизвестным языком — понятная ошибка', async () => {
    await expect(figmaExport(service, { prefixes: [' '] })).rejects.toThrow('хотя бы один раздел')
    await expect(figmaExport(service, { prefixes: ['common.'], languages: ['xx'] })).rejects.toThrow('Неизвестные языки: xx')
  })
})

describe('тексты для плагина Figma', () => {
  it('разделы — то же дерево, что слева в сервисе, глубже двух уровней', async () => {
    const { sections, modes } = await figmaPluginSections(service)
    const inapp = sections.find(s => s.path === 'legacy')!.children.find(s => s.path === 'legacy.inapp')!
    expect(inapp.children.map(s => s.path)).toContain('legacy.inapp.basic')
    expect(modes[0]).toEqual({ code: 'en', name: 'English' })
  })

  it('вся выборка: режимы с английскими названиями, переменные с именами через /', async () => {
    const result = await figmaPluginTexts(service, { prefixes: ['legacy.pages_hub.'], languages: ['ru', 'en'] })
    expect(result.modes).toEqual([{ code: 'en', name: 'English' }, { code: 'ru', name: 'Russian' }])
    expect(result.variables).toHaveLength(25)
    expect(result.removed).toEqual([])
    expect(Number.isNaN(Date.parse(result.now))).toBe(false)
    const code = result.variables.find(v => v.key === 'legacy.pages_hub.a.gift_card.common.gift_card_code')!
    expect(code).toEqual({
      key: 'legacy.pages_hub.a.gift_card.common.gift_card_code',
      name: 'legacy/pages_hub/a/gift_card/common/gift_card_code',
      description: '',
      values: { en: 'Gift Code: {0}', ru: 'Подарочный Код: {0}' }
    })
  })

  it('с since — только изменённое; помеченный устаревшим ключ уходит в removed', async () => {
    await restore()
    const since = new Date().toISOString()
    const value = `Selbsttest ${Date.now()}`
    expect((await translate('de', value)).error).toBeNull()

    // Запас в 30 с может принести и другие служебные ключи, только что тронутые соседними тестами
    const changed = await figmaPluginTexts(service, { prefixes: ['common.selftest.'], languages: ['en', 'de'], since })
    expect(changed.variables.find(v => v.key === ANCHOR)?.values.de).toBe(value)
    expect(changed.removed).not.toContain(ANCHOR)

    await deprecate()
    const removed = await figmaPluginTexts(service, { prefixes: ['common.selftest.'], since: changed.now })
    expect(removed.variables.map(v => v.key)).not.toContain(ANCHOR)
    expect(removed.removed).toContain(ANCHOR)

    // Изменения раньше since (с учётом запаса в 30 с) не приходят
    const later = await figmaPluginTexts(service, { prefixes: ['common.selftest.'], since: new Date(Date.now() + 60_000).toISOString() })
    expect(later.variables).toEqual([])
    expect(later.removed).toEqual([])
  })

  it('since не время — понятная ошибка', async () => {
    await expect(figmaPluginTexts(service, { prefixes: ['common.'], since: 'вчера' })).rejects.toThrow('since — время в формате ISO 8601')
  })
})
