import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { figmaExport } from '../../apps/central-hub/server/lib/figma'
import { ACTOR, ANCHOR, ensureAnchor, service } from './clients'

const restore = () => service.rpc('restore_keys', { p_keys: [ANCHOR], p_actor: ACTOR, p_source: 'test' })
const deprecate = () => service.rpc('deprecate_keys', { p_keys: [ANCHOR], p_actor: ACTOR, p_source: 'test' })

beforeAll(ensureAnchor)
afterAll(deprecate)

describe('выгрузка в Figma', () => {
  it('раздел и его подраздел не дают повторов, имена через /', async () => {
    const { keys, file } = await figmaExport(service, { prefixes: ['legacy.pages_hub.', 'legacy.pages_hub.a.gift_card'] })
    const names = Object.keys(file.Localizations!)
    expect(keys).toBe(25)
    expect(names).toHaveLength(25)
    expect(names.every(name => name.startsWith('legacy/pages_hub/') && !name.includes('.'))).toBe(true)
  })

  it('режимы — выбранные языки в порядке грида', async () => {
    const { languages, file } = await figmaExport(service, { prefixes: ['legacy.pages_hub.'], languages: ['ru', 'en'] })
    expect(languages).toEqual(['en', 'ru'])
    expect(Object.keys(file.Localizations!['legacy/pages_hub/a/gift_card/common/gift_card_code']!.$value)).toEqual(['en', 'ru'])
  })

  it('ключ, помеченный устаревшим, в выгрузку не попадает', async () => {
    await restore()
    const active = await figmaExport(service, { prefixes: ['common.selftest.anchor'] })
    expect(Object.keys(active.file.Localizations!)).toContain('common/selftest/anchor/default')

    await deprecate()
    const hidden = await figmaExport(service, { prefixes: ['common.selftest.anchor'] })
    expect(hidden.keys).toBe(0)
  })

  it('без разделов и с неизвестным языком — понятная ошибка', async () => {
    await expect(figmaExport(service, { prefixes: [' '] })).rejects.toThrow('хотя бы один раздел')
    await expect(figmaExport(service, { prefixes: ['common.'], languages: ['xx'] })).rejects.toThrow('Неизвестные языки: xx')
  })
})
