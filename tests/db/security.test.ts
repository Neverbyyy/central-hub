import { beforeAll, describe, expect, it } from 'vitest'
import { ANCHOR, anon, ensureAnchor, readAnchor, service } from './clients'

// Всё, что разрешено ролям anon и authenticated. Любое новое право — осознанное решение:
// сначала добавь его сюда, иначе тест упадёт.
const ALLOWED = [
  'function get_unique_tags() anon EXECUTE',
  'table languages anon SELECT',
  'table localizations anon SELECT',
  'table registry anon SELECT'
]

const PERMISSION_DENIED = '42501'

beforeAll(ensureAnchor)

describe('права в базе', () => {
  it('у anon и authenticated только белый список, RLS включён на всех таблицах', async () => {
    const { data, error } = await service.rpc('security_audit')
    expect(error).toBeNull()
    const rows = (data as { object_type: string, object_name: string, grantee: string | null, privilege: string | null }[])
      .map(r => [r.object_type, r.object_name, r.grantee, r.privilege].filter(Boolean).join(' '))
    expect(rows.sort()).toEqual([...ALLOWED].sort())
  })
})

describe('публичный ключ ничего не может записать', () => {
  const rows = {
    localizations: { technical_key: 'common.selftest.anon_insert', description: 'Не должен появиться', translations: { en: 'x' } },
    languages: { code: 'xx', name: 'Test' },
    registry: { kind: 'game', code: 'selftest', title: 'Test' },
    history: { technical_key: ANCHOR, field: 'translation', actor: 'anon', source: 'anon' },
    export_sets: { name: 'selftest', project: 'inapp', format: 'flat', languages: ['en'], path_template: '{lang}.json' },
    export_templates: { set_name: 'inapp', lang: 'en', content: '{}' }
  } as const

  // Фильтр обязателен: без него запрос отклонили бы по другой причине и тест прошёл бы впустую
  const filters = {
    localizations: ['technical_key', ANCHOR],
    languages: ['code', 'en'],
    registry: ['code', 'cars2'],
    history: ['technical_key', ANCHOR],
    export_sets: ['name', 'inapp'],
    export_templates: ['set_name', 'inapp']
  } as const

  it.each(Object.keys(rows) as (keyof typeof rows)[])('%s: insert, upsert, update и delete отклоняются', async (table) => {
    const [column, value] = filters[table]
    const attempts = await Promise.all([
      anon.from(table).insert(rows[table]),
      anon.from(table).upsert(rows[table]),
      anon.from(table).update(rows[table]).eq(column, value),
      anon.from(table).delete().eq(column, value)
    ])
    for (const { error } of attempts) expect(error?.code).toBe(PERMISSION_DENIED)
  })

  it('строка не изменилась после попыток anon', async () => {
    const before = await readAnchor()
    await anon.from('localizations').update({ description: 'взлом' }).eq('technical_key', ANCHOR)
    expect((await readAnchor()).description).toBe(before.description)
  })

  it.each([
    ['set_translation', { p_key: ANCHOR, p_lang: 'en', p_value: 'взлом', p_actor: 'anon', p_source: 'anon' }],
    ['deprecate_keys', { p_keys: [ANCHOR], p_actor: 'anon', p_source: 'anon' }],
    ['restore_keys', { p_keys: [ANCHOR], p_actor: 'anon', p_source: 'anon' }],
    ['security_audit', {}],
    ['l10n_key_error', { p_key: ANCHOR }],
    ['import_legacy', { p_set: 'inapp', p_rows: [], p_templates: {}, p_source_ref: null, p_actor: 'anon', p_source: 'anon' }],
    ['create_key', { p_key: 'common.selftest.anon', p_description: 'взлом', p_translations: {}, p_tags: [], p_max_length: null, p_status: 'approved', p_actor: 'anon', p_source: 'anon' }],
    ['set_ai_translation', { p_key: ANCHOR, p_lang: 'en', p_value: 'взлом', p_actor: 'anon' }],
    ['find_similar', { p_text: 'Continue', p_key: '', p_limit: 5 }]
  ])('функцию %s вызвать нельзя', async (fn, args) => {
    const { error } = await anon.rpc(fn, args)
    expect(error?.code).toBe(PERMISSION_DENIED)
  })

  it.each(['history', 'export_sets', 'export_templates'])('%s прочитать нельзя', async (table) => {
    const { error } = await anon.from(table).select('*').limit(1)
    expect(error?.code).toBe(PERMISSION_DENIED)
  })
})

describe('публичный ключ читает то, что нужно гриду', () => {
  it('ключи, языки, справочник и теги', async () => {
    const [keys, languages, registry, tags] = await Promise.all([
      anon.from('localizations').select('technical_key').limit(1),
      anon.from('languages').select('code').order('position'),
      anon.from('registry').select('kind, code'),
      anon.rpc('get_unique_tags')
    ])
    expect(keys.error).toBeNull()
    expect(languages.data?.map(l => l.code)).toEqual(['en', 'ru', 'de', 'es', 'it', 'pt', 'fr', 'sv', 'nl'])
    expect(registry.data?.length).toBeGreaterThan(0)
    expect(tags.error).toBeNull()
  })
})
