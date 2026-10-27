import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { ACTOR, ANCHOR, ensureAnchor, readAnchor, service } from './clients'

const SOURCE = 'test'

const setTranslation = (lang: string, value: string) =>
  service.rpc('set_translation', { p_key: ANCHOR, p_lang: lang, p_value: value, p_actor: ACTOR, p_source: SOURCE })

beforeAll(async () => {
  await ensureAnchor()
  await service.rpc('restore_keys', { p_keys: [ANCHOR], p_actor: ACTOR, p_source: SOURCE })
})

afterAll(async () => {
  await service.rpc('deprecate_keys', { p_keys: [ANCHOR], p_actor: ACTOR, p_source: SOURCE })
})

describe('set_translation', () => {
  it('правка английского делает переводы устаревшими', async () => {
    const run = Date.now()
    expect((await setTranslation('en', `Selftest ${run}`)).error).toBeNull()
    expect((await setTranslation('de', `Selbsttest ${run}`)).error).toBeNull()

    const translated = await readAnchor()
    expect(translated.status.de).toBe('draft')
    expect(translated.based_on.de).toBe(translated.source_rev)

    expect((await setTranslation('en', `Selftest ${run} v2`)).error).toBeNull()
    const changed = await readAnchor()
    expect(changed.source_rev).toBe(translated.source_rev + 1)
    expect(changed.based_on.de).toBeLessThan(changed.source_rev)
  })

  it('то же значение ничего не меняет', async () => {
    const before = await readAnchor()
    const { data, error } = await setTranslation('en', before.translations.en)
    expect(error).toBeNull()
    expect(new Date(data as string).getTime()).toBe(new Date(before.updated_at).getTime())
    expect((await readAnchor()).source_rev).toBe(before.source_rev)
  })

  it('пустое значение убирает перевод и его статус', async () => {
    expect((await setTranslation('de', '')).error).toBeNull()
    const row = await readAnchor()
    expect(row.translations).not.toHaveProperty('de')
    expect(row.status).not.toHaveProperty('de')
    expect(row.based_on).not.toHaveProperty('de')
  })

  it('отклоняет неизвестный ключ и неизвестный язык', async () => {
    const missingKey = await service.rpc('set_translation', { p_key: 'common.selftest.missing', p_lang: 'en', p_value: 'x', p_actor: ACTOR, p_source: SOURCE })
    expect(missingKey.error?.code).toBe('P0002')

    const unknownLanguage = await setTranslation('xx', 'x')
    expect(unknownLanguage.error?.message).toContain('Неизвестный язык «xx»')
  })
})

describe('история', () => {
  it('записывает автора, источник и старое и новое значение', async () => {
    const before = await readAnchor()
    const value = `Selbsttest ${Date.now()}`
    expect((await setTranslation('de', value)).error).toBeNull()

    const { data, error } = await service
      .from('history')
      .select('lang, field, old_value, new_value, actor, source')
      .eq('technical_key', ANCHOR)
      .order('id', { ascending: false })
      .limit(1)
      .single()
    expect(error).toBeNull()
    expect(data).toEqual({ lang: 'de', field: 'translation', old_value: before.translations.de ?? null, new_value: value, actor: ACTOR, source: SOURCE })
  })

  it('пометка «устарел» и возврат тоже попадают в историю', async () => {
    await service.rpc('deprecate_keys', { p_keys: [ANCHOR], p_actor: ACTOR, p_source: SOURCE })
    await service.rpc('restore_keys', { p_keys: [ANCHOR], p_actor: ACTOR, p_source: SOURCE })

    const { data } = await service
      .from('history')
      .select('field, old_value, new_value')
      .eq('technical_key', ANCHOR)
      .eq('field', 'deprecated')
      .order('id', { ascending: false })
      .limit(2)
    expect(data).toEqual([
      { field: 'deprecated', old_value: 'устарел', new_value: null },
      { field: 'deprecated', old_value: null, new_value: 'устарел' }
    ])
  })
})
