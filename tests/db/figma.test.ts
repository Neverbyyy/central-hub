import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FigmaGroup, FigmaToken } from '../../packages/l10n-core/src'
import { figmaExport } from '../../apps/central-hub/server/lib/figma'
import { ACTOR, ANCHOR, ensureAnchor, service } from './clients'

const restore = () => service.rpc('restore_keys', { p_keys: [ANCHOR], p_actor: ACTOR, p_source: 'test' })
const deprecate = () => service.rpc('deprecate_keys', { p_keys: [ANCHOR], p_actor: ACTOR, p_source: 'test' })

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
