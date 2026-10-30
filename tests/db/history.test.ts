import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { keyHistory } from '../../apps/central-hub/server/lib/history'
import { ACTOR, ANCHOR, ensureAnchor, service } from './clients'

const set = (lang: string, value: string) =>
  service.rpc('set_translation', { p_key: ANCHOR, p_lang: lang, p_value: value, p_actor: ACTOR, p_source: 'test' })

beforeAll(async () => {
  await ensureAnchor()
  await service.rpc('restore_keys', { p_keys: [ANCHOR], p_actor: ACTOR, p_source: 'test' })
})

afterAll(async () => {
  await service.rpc('deprecate_keys', { p_keys: [ANCHOR], p_actor: ACTOR, p_source: 'test' })
})

describe('история ключа действиями', () => {
  it('правка — одно действие, «Утвердить» нескольких языков — одно действие с записью на язык', async () => {
    const run = Date.now()
    await set('en', `History ${run}`)
    await set('de', `History DE ${run}`)
    expect((await service.rpc('approve_translations', { p_key: ANCHOR, p_langs: ['en', 'de'], p_actor: ACTOR })).error).toBeNull()

    const { actions } = await keyHistory(service, ANCHOR, { limit: 3 })
    expect(actions).toHaveLength(3)
    // Утверждение двух языков — одна транзакция, одно действие
    expect(actions[0]).toMatchObject({ actor: ACTOR, source: 'ui' })
    expect(actions[0]!.entries).toHaveLength(2)
    expect(actions[0]!.entries).toEqual(expect.arrayContaining([
      { lang: 'en', field: 'status', old_value: 'draft', new_value: 'approved' },
      { lang: 'de', field: 'status', old_value: 'draft', new_value: 'approved' }
    ]))
    // Каждая правка — своё действие
    expect(actions[1]).toMatchObject({ actor: ACTOR, source: 'test' })
    // Прежний текст зависит от прошлых прогонов (на чистой базе его нет) — проверяем новое
    expect(actions[1]!.entries).toEqual([expect.objectContaining({ lang: 'de', field: 'translation', new_value: `History DE ${run}` })])
    expect(actions[2]!.entries).toEqual([expect.objectContaining({ lang: 'en', field: 'translation', new_value: `History ${run}` })])
  })

  it('total, offset и limit считают действия, а не строки', async () => {
    const all = await keyHistory(service, ANCHOR, { limit: 1000 })
    expect(all.total).toBe(all.actions.length)
    // Строк больше, чем действий: «Утвердить» дал две строки одним действием
    expect(all.actions.reduce((n, a) => n + a.entries.length, 0)).toBeGreaterThan(all.total)

    const page = await keyHistory(service, ANCHOR, { offset: 1, limit: 2 })
    expect(page.total).toBe(all.total)
    expect(page.actions.map(a => a.id)).toEqual(all.actions.slice(1, 3).map(a => a.id))
  })
})
