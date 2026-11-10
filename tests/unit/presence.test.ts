import { describe, expect, it } from 'vitest'
import {
  presenceCell,
  presenceColor,
  presenceDevice,
  presenceDuration,
  presenceEditors,
  presenceInitials,
  presenceLabel,
  presenceOnline,
  presenceOthers,
  presencePeople,
  presenceSelf,
  type PresencePerson
} from '../../apps/central-hub/app/utils/presence'

// Присутствие в сервисе (apps/central-hub/app/utils/presence.ts): состояние канала от чужих вкладок → люди и метки
const SELF = { tab: 'my-tab', name: 'Артём' }
const person = (tab: string, name: string, extra: Partial<PresencePerson> = {}): PresencePerson =>
  ({ tab, name, page: 'Локализации', editing: null, since: 1000, device: 'desktop', ...extra })

describe('присутствие: состояние канала', () => {
  it('у вкладки берётся последнее состояние; без имени отсеивается, непонятные поля — по умолчанию; editing — не отсюда', () => {
    const people = presencePeople({
      a: [{ name: 'Антон', page: 'Главная', editing: null }, { name: 'Антон', page: 'Локализации', editing: { key: 'app.cars2.paywall.title', lang: 'de' }, since: 5000, device: 'phone' }],
      b: [{ name: '  ', page: 'Главная' }],
      c: [{ page: 'Главная' }],
      d: [{ name: 'Кирилл', page: 3, editing: { key: 1, lang: 'de' }, since: 'вчера', device: 'холодильник' }],
      e: []
    })
    expect(people).toEqual([
      { tab: 'a', name: 'Антон', page: 'Локализации', editing: null, since: 5000, device: 'phone' },
      { tab: 'd', name: 'Кирилл', page: '', editing: null, since: 0, device: 'desktop' }
    ])
  })

  it('в шапке — другие люди: без своих вкладок и тёзок, вкладки одного человека — одна запись, по алфавиту', () => {
    const others = presenceOthers([
      person('my-tab', 'Артём'),
      person('my-other-tab', 'Артём', { editing: { key: 'common.a', lang: 'ru' } }),
      person('t1', 'Кирилл'),
      person('t2', 'Антон', { since: 3000 }),
      person('t3', 'Антон', { since: 2000, page: 'Очередь перевода', editing: { key: 'common.a', lang: 'de' } })
    ], SELF)
    expect(others.map(p => p.name)).toEqual(['Антон', 'Кирилл'])
    // У Антона две вкладки — показана та, где он что-то правит, «в сервисе с» — от самой ранней
    expect(others[0]).toMatchObject({ page: 'Очередь перевода', editing: { key: 'common.a', lang: 'de' }, since: 2000 })
  })

  it('сам человек — его вкладки одной записью; сколько в сервисе — по именам, вместе с собой', () => {
    const people = [person('my-tab', 'Артём', { since: 4000 }), person('my-other-tab', 'Артём', { since: 1000 }), person('t1', 'Кирилл'), person('t2', 'Кирилл')]
    expect(presenceSelf(people, SELF)).toMatchObject({ name: 'Артём', since: 1000 })
    expect(presenceOnline(people, SELF)).toBe(2)
    // Своя вкладка ещё не подключилась — себя всё равно считаем
    expect(presenceOnline([person('t1', 'Кирилл')], SELF)).toBe(2)
    expect(presenceSelf([person('t1', 'Кирилл')], SELF)).toBeNull()
  })

  it('ячейка из сообщения чужой вкладки: только ключ и язык строками', () => {
    expect(presenceCell({ key: 'common.a', lang: 'de', extra: '<b>' })).toEqual({ key: 'common.a', lang: 'de' })
    expect(presenceCell({ key: 'common.a' })).toBeNull()
    expect(presenceCell({ key: 1, lang: 'de' })).toBeNull()
    expect(presenceCell(null)).toBeNull()
    expect(presenceCell('common.a')).toBeNull()
  })

  it('кто что правит: ключ → язык → имена, без себя и без повторов', () => {
    const editors = presenceEditors([
      person('my-tab', 'Артём', { editing: { key: 'common.a', lang: 'de' } }),
      person('t1', 'Антон', { editing: { key: 'common.a', lang: 'de' } }),
      person('t2', 'Антон', { editing: { key: 'common.a', lang: 'de' } }),
      person('t3', 'Кирилл', { editing: { key: 'common.a', lang: 'de' } }),
      person('t4', 'Кирилл', { editing: { key: 'common.b', lang: 'ru' } }),
      person('t5', 'Саша')
    ], SELF)
    expect(editors).toEqual({ 'common.a': { de: ['Антон', 'Кирилл'] }, 'common.b': { ru: ['Кирилл'] } })
  })
})

describe('присутствие: подписи', () => {
  it('«Антон правит DE», двое и больше — «Антон +1 правят DE»', () => {
    expect(presenceLabel(['Антон'], 'de')).toBe('Антон правит DE')
    expect(presenceLabel(['Антон', 'Кирилл'], 'de')).toBe('Антон +1 правят DE')
  })

  it('в кружке — первая буква имени, заглавная', () => {
    expect(presenceInitials('Антон')).toBe('А')
    expect(presenceInitials('антон петров')).toBe('А')
    expect(presenceInitials('  Я ')).toBe('Я')
  })

  it('сколько в сервисе: только что, минуты, часы', () => {
    const now = 10 * 60 * 60 * 1000
    expect(presenceDuration(now - 20_000, now)).toBe('меньше минуты')
    expect(presenceDuration(now - 12 * 60_000, now)).toBe('12 мин')
    expect(presenceDuration(now - 65 * 60_000, now)).toBe('1 ч 5 мин')
    expect(presenceDuration(now - 120 * 60_000, now)).toBe('2 ч')
    expect(presenceDuration(0, now)).toBe('')
  })

  it('устройство: мышь — компьютер, касание — телефон или планшет по короткой стороне', () => {
    expect(presenceDevice(false, 390, 844)).toBe('desktop')
    expect(presenceDevice(true, 390, 844)).toBe('phone')
    expect(presenceDevice(true, 844, 390)).toBe('phone')
    expect(presenceDevice(true, 768, 1024)).toBe('tablet')
  })

  it('цвет зависит только от имени — у всех коллег одинаковый', () => {
    expect(presenceColor('Антон')).toBe(presenceColor('Антон'))
    expect(presenceColor('Антон')).toMatch(/^#[0-9a-f]{6}$/)
    const colors = new Set(['Антон', 'Кирилл', 'Александр', 'Артём', 'Маша', 'Саша'].map(presenceColor))
    expect(colors.size).toBeGreaterThan(2)
  })
})
