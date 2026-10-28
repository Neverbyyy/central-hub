import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { type KeyMetaInput, queueCounts, translationQueue, updateKeyMeta } from '../../apps/central-hub/server/lib/keys'
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

describe('очередь перевода', () => {
  it('счётчики по языкам совпадают с самой очередью', async () => {
    await set('en', `Queue ${Date.now()}`)
    await set('es', '')
    const counts = await queueCounts(service, { prefix: 'common.selftest.anchor.' })
    expect(counts.map(c => c.lang)).not.toContain('en')

    for (const count of counts) {
      const { total } = await translationQueue(service, { lang: count.lang, prefix: 'common.selftest.anchor.' })
      expect(count.missing + count.stale).toBe(total)
    }
    expect(counts.find(c => c.lang === 'es')?.missing).toBe(1)
  })
})

describe('свойства ключа', () => {
  const DESCRIPTION = 'Служебный ключ автотестов базы, в продуктах не используется'
  const LEGACY = 'legacy.pages_hub.a.gift_card.common.gift_card_code'
  const meta = (input: Omit<Partial<KeyMetaInput>, 'key'>, key = ANCHOR) =>
    updateKeyMeta(service, { key, description: DESCRIPTION, tags: [], maxLength: null, figmaUrl: null, ...input }, { actor: ACTOR })

  it('меняет описание, теги, лимит и ссылку и пишет историю', async () => {
    const description = `${DESCRIPTION}, правка ${Date.now()}`
    await meta({ description, tags: [' meta-test ', 'meta-test', 'panel'], maxLength: 40, figmaUrl: 'https://www.figma.com/design/abc/Selftest?node-id=1-2' })
    const row = await readAnchor()
    expect(row).toMatchObject({ description, tags: ['meta-test', 'panel'], max_length: 40, figma_url: 'https://www.figma.com/design/abc/Selftest?node-id=1-2' })

    const { data } = await service.from('history').select('field, actor, source')
      .eq('technical_key', ANCHOR).in('field', ['description', 'tags', 'max_length', 'figma_url'])
      .order('id', { ascending: false }).limit(4)
    expect(new Set(data!.map(h => h.field))).toEqual(new Set(['description', 'tags', 'max_length', 'figma_url']))
    expect(data!.every(h => h.actor === ACTOR && h.source === 'ui')).toBe(true)

    // Обратно — служебный ключ не должен приносить теги в фильтр грида
    await meta({})
  })

  it('без изменений ничего не пишет и не трогает updated_at', async () => {
    await meta({})
    const before = await readAnchor()
    await meta({})
    expect((await readAnchor()).updated_at).toBe(before.updated_at)
  })

  it('короткое описание, чужая ссылка и неверный лимит отклоняются', async () => {
    await expect(meta({ description: 'коротко' })).rejects.toThrow('от 10 символов')
    await expect(meta({ figmaUrl: 'https://example.com/design' })).rejects.toThrow('figma.com')
    await expect(meta({ maxLength: 0 })).rejects.toThrow('Лимит длины')
    await expect(meta({ maxLength: 1.5 })).rejects.toThrow('Лимит длины')
  })

  it('у строки InApp или Pages Hub описание можно оставить пустым', async () => {
    await meta({ description: '', tags: ['gift-card'] }, LEGACY)
    const { data } = await service.from('localizations').select('description, tags').eq('technical_key', LEGACY).single()
    expect(data).toEqual({ description: null, tags: ['gift-card'] })
    await meta({ description: '', tags: [] }, LEGACY)
  })

  it('ключ, помеченный устаревшим, не правится', async () => {
    await service.rpc('deprecate_keys', { p_keys: [ANCHOR], p_actor: ACTOR, p_source: 'test' })
    await expect(meta({ maxLength: 10 })).rejects.toMatchObject({ message: expect.stringContaining('помечен устаревшим') })
    await service.rpc('restore_keys', { p_keys: [ANCHOR], p_actor: ACTOR, p_source: 'test' })
  })
})
