import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { ACTOR, ANCHOR, ensureAnchor, readAnchor, service } from './clients'

const set = (lang: string, value: string, expected?: string) =>
  service.rpc('set_translation', { p_key: ANCHOR, p_lang: lang, p_value: value, p_actor: ACTOR, p_source: 'test', ...(expected === undefined ? {} : { p_expected: expected }) })

const approve = (langs: string[]) => service.rpc('approve_translations', { p_key: ANCHOR, p_langs: langs, p_actor: ACTOR })

beforeAll(async () => {
  await ensureAnchor()
  await service.rpc('restore_keys', { p_keys: [ANCHOR], p_actor: ACTOR, p_source: 'test' })
})

afterAll(async () => {
  await service.rpc('deprecate_keys', { p_keys: [ANCHOR], p_actor: ACTOR, p_source: 'test' })
})

describe('устаревшие и статусы для фильтров', () => {
  it('stale_langs и status_values считаются сами', async () => {
    const run = Date.now()
    await set('en', `Editor ${run}`)
    await set('de', `Editor DE ${run}`)
    expect((await readAnchor()).stale_langs).not.toContain('de')

    await set('en', `Editor ${run} v2`)
    const row = await readAnchor()
    expect(row.stale_langs).toContain('de')
    expect(row.status_values).toContain('draft')
  })
})

describe('утверждение', () => {
  it('ставит approved и снимает «устарел»; язык без текста пропускается', async () => {
    await set('nl', '')
    // С прошлых прогонов у якоря бывают и другие языки — утверждаем все, где есть текст
    const withText = Object.keys((await readAnchor()).translations)
    const { data, error } = await approve([...withText, 'nl'])
    expect(error).toBeNull()
    expect(data).toBe(withText.length)

    const row = await readAnchor()
    expect(row.status.de).toBe('approved')
    expect(row.status.en).toBe('approved')
    expect(row.stale_langs).toEqual([])
    expect(row.status_values).toEqual(['approved'])

    const { data: last } = await service.from('history').select('field, lang, new_value, source').eq('technical_key', ANCHOR).order('id', { ascending: false }).limit(1).single()
    expect(last).toMatchObject({ field: 'status', new_value: 'approved', source: 'ui' })

    expect((await approve(['de'])).data).toBe(0)
  })
})

describe('одновременная правка одной ячейки', () => {
  it('другое ожидаемое значение → HB409 с текущим текстом и автором', async () => {
    const current = (await readAnchor()).translations.de
    const { error } = await set('de', 'Моя правка', 'то, что я видел раньше')
    expect(error?.code).toBe('HB409')
    expect(JSON.parse(error!.details)).toMatchObject({ current, actor: ACTOR })
    expect((await readAnchor()).translations.de).toBe(current)
  })

  it('совпадающее ожидаемое значение — сохраняется; без expected — как раньше', async () => {
    const current = (await readAnchor()).translations.de
    expect((await set('de', `${current}!`, current)).error).toBeNull()
    expect((await set('de', current)).error).toBeNull()
  })

  it('если в ячейке уже ровно мой текст — не конфликт', async () => {
    const current = (await readAnchor()).translations.de
    expect((await set('de', current, 'устаревшее ожидание')).error).toBeNull()
  })
})
