import { describe, expect, it } from 'vitest'
import { presenceColor, presenceEditors, presenceLabel, presenceOthers, presencePeople } from '../../apps/central-hub/app/utils/presence'

// Присутствие в сервисе (apps/central-hub/app/utils/presence.ts): состояние канала от чужих вкладок → люди и метки
const SELF = { tab: 'my-tab', name: 'Артём' }

describe('присутствие: состояние канала', () => {
  it('у вкладки берётся последнее состояние; без имени и с непонятной ячейкой — отсеиваются', () => {
    const people = presencePeople({
      a: [{ name: 'Антон', page: 'Главная', editing: null }, { name: 'Антон', page: 'Локализации', editing: { key: 'app.cars2.paywall.title', lang: 'de' } }],
      b: [{ name: '  ', page: 'Главная' }],
      c: [{ page: 'Главная' }],
      d: [{ name: 'Кирилл', page: 3, editing: { key: 1, lang: 'de' } }],
      e: []
    })
    expect(people).toEqual([
      { tab: 'a', name: 'Антон', page: 'Локализации', editing: { key: 'app.cars2.paywall.title', lang: 'de' } },
      { tab: 'd', name: 'Кирилл', page: '', editing: null }
    ])
  })

  it('в шапке — другие люди: без своих вкладок и тёзок, одно имя — один человек, по алфавиту', () => {
    const others = presenceOthers([
      { tab: 'my-tab', name: 'Артём', page: 'Главная', editing: null },
      { tab: 'my-other-tab', name: 'Артём', page: 'Очередь перевода', editing: { key: 'common.a', lang: 'ru' } },
      { tab: 't1', name: 'Кирилл', page: 'Главная', editing: null },
      { tab: 't2', name: 'Антон', page: 'Главная', editing: null },
      { tab: 't3', name: 'Антон', page: 'Локализации', editing: { key: 'common.a', lang: 'de' } }
    ], SELF)
    expect(others.map(p => p.name)).toEqual(['Антон', 'Кирилл'])
    // У Антона две вкладки — показана та, где он что-то правит
    expect(others[0]!.editing).toEqual({ key: 'common.a', lang: 'de' })
  })

  it('кто что правит: ключ → язык → имена, без себя и без повторов', () => {
    const editors = presenceEditors([
      { tab: 'my-tab', name: 'Артём', page: '', editing: { key: 'common.a', lang: 'de' } },
      { tab: 't1', name: 'Антон', page: '', editing: { key: 'common.a', lang: 'de' } },
      { tab: 't2', name: 'Антон', page: '', editing: { key: 'common.a', lang: 'de' } },
      { tab: 't3', name: 'Кирилл', page: '', editing: { key: 'common.a', lang: 'de' } },
      { tab: 't4', name: 'Кирилл', page: '', editing: { key: 'common.b', lang: 'ru' } },
      { tab: 't5', name: 'Саша', page: '', editing: null }
    ], SELF)
    expect(editors).toEqual({ 'common.a': { de: ['Антон', 'Кирилл'] }, 'common.b': { ru: ['Кирилл'] } })
  })
})

describe('присутствие: метка и цвет', () => {
  it('«Антон правит DE», двое и больше — «Антон +1 правят DE»', () => {
    expect(presenceLabel(['Антон'], 'de')).toBe('Антон правит DE')
    expect(presenceLabel(['Антон', 'Кирилл'], 'de')).toBe('Антон +1 правят DE')
  })

  it('цвет зависит только от имени — у всех коллег одинаковый', () => {
    expect(presenceColor('Антон')).toBe(presenceColor('Антон'))
    expect(presenceColor('Антон')).toMatch(/^#[0-9a-f]{6}$/)
    const colors = new Set(['Антон', 'Кирилл', 'Александр', 'Артём', 'Маша', 'Саша'].map(presenceColor))
    expect(colors.size).toBeGreaterThan(2)
  })
})
