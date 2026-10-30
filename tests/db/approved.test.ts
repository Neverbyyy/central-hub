import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { readLocaleFile } from '../../packages/l10n-core/src'
import { exportSet, pendingApproval } from '../../apps/central-hub/server/lib/sync'
import { ACTOR, service } from './clients'

// В проекты уходит только утверждённое. Свой набор на служебном ключе: настоящие наборы
// исключают common.selftest.*, а этот берёт только его — выгрузки InApp и Pages Hub не задеваются.
const SET = 'selftest_approved'
const KEY = 'common.selftest.approved_export.default'

const exported = async () => {
  const { files } = await exportSet(service, SET)
  const en = readLocaleFile(files.find(f => f.lang === 'en')!.content)
  return en.find(e => e.path.join('.') === KEY)?.value
}

const setEn = async (value: string) => {
  const { error } = await service.rpc('set_translation', { p_key: KEY, p_lang: 'en', p_value: value, p_actor: ACTOR, p_source: 'test' })
  if (error) throw error
}

beforeAll(async () => {
  const set = await service.from('export_sets').upsert({
    name: SET,
    project: 'inapp',
    format: 'nested',
    include_prefixes: ['common.selftest.approved_export.'],
    exclude_prefixes: [],
    languages: ['en', 'ru'],
    path_template: 'locales/{lang}.json'
  })
  if (set.error) throw set.error

  // Удалять ключи нельзя: между прогонами он лежит помеченным устаревшим
  const key = await service.from('localizations').upsert(
    { technical_key: KEY, description: 'Служебный ключ автотеста выгрузки утверждённых текстов', translations: {} },
    { onConflict: 'technical_key', ignoreDuplicates: true }
  )
  if (key.error) throw key.error
  const restored = await service.rpc('restore_keys', { p_keys: [KEY], p_actor: ACTOR, p_source: 'test' })
  if (restored.error) throw restored.error
})

afterAll(async () => {
  await service.rpc('deprecate_keys', { p_keys: [KEY], p_actor: ACTOR, p_source: 'test' })
  await service.from('export_sets').delete().eq('name', SET)
})

describe('выгрузка утверждённых текстов', () => {
  const draft = `Draft ${Date.now()}`

  it('черновик в файлы не попадает, а ключ считается ждущим утверждения', async () => {
    const before = await exported()
    await setEn(draft)
    expect(await exported()).toBe(before)
    expect(await exported()).not.toBe(draft)
    expect(await pendingApproval(service, SET)).toBe(1)
  })

  it('после утверждения текст в выгрузке, ждущих нет', async () => {
    const { data, error } = await service.rpc('approve_keys', { p_keys: [KEY], p_actor: ACTOR })
    expect(error).toBeNull()
    expect(data).toBe(1)
    expect(await exported()).toBe(draft)
    expect(await pendingApproval(service, SET)).toBe(0)
  })

  it('новая правка не трогает утверждённое, пока её не утвердят', async () => {
    await setEn(`${draft} v2`)
    expect(await exported()).toBe(draft)

    const { data } = await service.from('localizations').select('approved, status').eq('technical_key', KEY).single()
    expect(data).toMatchObject({ approved: { en: draft }, status: { en: 'draft' } })
  })

  it('колонку approved нельзя переписать напрямую — только утверждением', async () => {
    const { error } = await service.from('localizations').update({ approved: { en: 'взлом' } }).eq('technical_key', KEY)
    expect(error).toBeNull()
    expect(await exported()).toBe(draft)
  })

  it('устаревший ключ из выгрузки пропадает', async () => {
    await service.rpc('deprecate_keys', { p_keys: [KEY], p_actor: ACTOR, p_source: 'test' })
    expect(await exported()).toBeUndefined()
    await service.rpc('restore_keys', { p_keys: [KEY], p_actor: ACTOR, p_source: 'test' })
  })
})
