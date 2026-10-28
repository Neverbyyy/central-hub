import { afterAll, describe, expect, it } from 'vitest'
import { createKey, findSimilar } from '../../apps/central-hub/server/lib/keys'
import { ACTOR, service } from './clients'

// Служебный ключ: создаётся при первом прогоне, дальше уже существует (удалить строки нельзя).
// Выгрузка его не видит — common.selftest.* исключены из наборов.
const KEY = 'common.selftest.ui_created.default'

const ui = { actor: ACTOR, source: 'ui' as const, status: 'draft' as const }

const create = (key: string, extra: Partial<Parameters<typeof createKey>[1]> = {}) =>
  createKey(service, { key, description: 'Служебный ключ автотестов создания ключей', translations: { en: 'Selftest created from UI' }, ...extra }, ui)

const setAi = (lang: string, value: string) =>
  service.rpc('set_ai_translation', { p_key: KEY, p_lang: lang, p_value: value, p_actor: 'Автотест ИИ' })

const setHuman = (lang: string, value: string) =>
  service.rpc('set_translation', { p_key: KEY, p_lang: lang, p_value: value, p_actor: ACTOR, p_source: 'test' })

afterAll(async () => {
  await setHuman('de', '')
  await service.rpc('deprecate_keys', { p_keys: [KEY], p_actor: ACTOR, p_source: 'test' })
})

describe('создание ключа из интерфейса', () => {
  it('создаётся черновиком с историей, второй раз — «уже есть»', async () => {
    const first = await create(KEY).then(() => 'created', (error: Error) => error.message)
    expect(['created', `Ключ «${KEY}» уже есть`]).toContain(first)
    await expect(create(KEY)).rejects.toThrow('уже есть')
    await service.rpc('restore_keys', { p_keys: [KEY], p_actor: ACTOR, p_source: 'test' })

    const { data: row } = await service.from('localizations').select('status, description').eq('technical_key', KEY).single()
    expect(row!.status.en).toBe('draft')
    const { data: created } = await service.from('history').select('source').eq('technical_key', KEY).eq('field', 'created').single()
    expect(created!.source).toBe('ui')
  })

  it.each([
    ['common.Selftest.ui', 'латиница'],
    ['app.selftest_unknown_game.title', 'код игры'],
    ['legacy.inapp.something', 'только импортом'],
    ['common.selftest.ui_created', 'один ключ не может быть началом другого']
  ])('«%s» не создаётся', async (key, message) => {
    await expect(create(key)).rejects.toThrow(message)
  })

  it('без описания не создаётся', async () => {
    await expect(create('common.selftest.no_description_ui', { description: 'коротко' })).rejects.toThrow('от 10 символов')
  })
})

describe('черновые переводы нейросети', () => {
  it('не перезаписывают текст человека, но обновляют свои черновики', async () => {
    const human = await setAi('en', 'Overwritten by AI')
    expect(human.error?.message).toContain('написал человек')

    await setHuman('de', '')
    expect((await setAi('de', 'Selbsttest aus der Oberfläche')).error).toBeNull()
    expect((await setAi('de', 'Selbsttest (KI, zweite Version)')).error).toBeNull()
    const { data: row } = await service.from('localizations').select('status, translations').eq('technical_key', KEY).single()
    expect(row!.status.de).toBe('ai')

    await setHuman('de', 'Selbsttest vom Menschen')
    expect((await setAi('de', 'KI überschreibt')).error?.message).toContain('написал человек')
  })
})

describe('похожие строки', () => {
  it('находят «Continue» среди строк InApp', async () => {
    const similar = await findSimilar(service, { text: 'Continue' })
    expect(similar.length).toBeGreaterThan(0)
    expect(similar[0]!.score).toBe(1)
    expect(similar.every(s => !s.technical_key.startsWith('common.selftest.'))).toBe(true)
  })
})
