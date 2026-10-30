import { describe, expect, it } from 'vitest'
import { editDistance, findSimilarCodes, indexKeyTree, keySuggestions, type RegistryCode } from '../../apps/central-hub/app/utils/keySuggestions'

const registry: RegistryCode[] = [
  { kind: 'game', code: 'cars2', title: 'Cars 2' },
  { kind: 'game', code: 'farm', title: 'Farm' },
  { kind: 'site', code: 'lp_cars2', title: 'Лендинг Cars 2' },
  { kind: 'test', code: 'tm12', title: 'tm12' }
]

const tree = indexKeyTree([
  { path: 'app', label: 'app', keys: 3, children: [
    { path: 'app.cars2', label: 'cars2', keys: 3, children: [
      { path: 'app.cars2.paywall', label: 'paywall', keys: 2, children: [] },
      { path: 'app.cars2.info', label: 'info', keys: 1, children: [] }
    ] }
  ] }
])

const targetNames = (key: string) => (key.startsWith('app.') ? 'InApp' : key.startsWith('web.') ? 'Pages Hub' : 'InApp и Pages Hub')
const suggest = (value: string) => keySuggestions(value, { registry, tree, targetNames })
const segments = (value: string) => suggest(value).map(s => s.segment)

describe('подсказки к ключу', () => {
  it('пустое поле — шесть начал, у каждого проект', () => {
    const list = suggest('')
    expect(list.map(s => s.segment)).toEqual(['app', 'web', 'common', 'brand', 'ds', 'test'])
    expect(list[0]).toMatchObject({ value: 'app.', targets: 'InApp' })
    expect(list[1]).toMatchObject({ targets: 'Pages Hub' })
  })

  it('по началу и по пояснению; по пояснению — от двух букв', () => {
    expect(segments('a')).toEqual(['app'])
    expect(segments('игр')).toEqual(['app'])
    // Ничего не подошло из известного списка — показываем весь
    expect(segments('le')).toHaveLength(6)
  })

  it('после app. — игры, новая — «добавить» первым, к похожему — после совпадений', () => {
    expect(segments('app.')).toEqual(['cars2', 'farm'])
    const added = suggest('app.dino')
    expect(added[0]).toMatchObject({ value: 'app.dino.', add: 'game', hint: 'добавить игру в справочник' })
    expect(segments('app.car')).toEqual(['cars2', 'car'])
    // Код из справочника — без «добавить»
    expect(suggest('app.farm').some(s => s.add)).toBe(false)
  })

  it('разделы: свои из дерева со счётчиком, типичные — если своих нет', () => {
    const cars = suggest('app.cars2.')
    expect(cars.map(s => s.segment)).toEqual(['paywall', 'info', 'onboarding', 'banner'])
    expect(cars[0]!.hint).toBe('пейволл · 2 ключа')
    expect(segments('app.farm.')).toEqual(['paywall', 'onboarding', 'banner'])
    // Последняя часть, которой нет среди разделов, — подсказок нет
    expect(suggest('app.cars2.paywall.title')).toEqual([])
  })

  it('test.<тест>. — дальше обычный ключ, без второго test.', () => {
    expect(segments('test.')).toEqual(['tm12'])
    expect(segments('test.tm12.')).toEqual(['app', 'web', 'common', 'brand', 'ds'])
    expect(segments('test.tm12.app.')).toEqual(['cars2', 'farm'])
  })

  it('пустая часть в середине — подсказок нет', () => {
    expect(suggest('app..x')).toEqual([])
  })
})

describe('похожие коды справочника', () => {
  it('editDistance', () => {
    expect(editDistance('cars2', 'cars2')).toBe(0)
    expect(editDistance('cars_2', 'cars2')).toBe(1)
    expect(editDistance('', 'farm')).toBe(4)
  })

  it('опечатка и недописанный код — похожи, короткий чужой — нет', () => {
    expect(findSimilarCodes({ kind: 'game', code: 'cars_2' }, registry).map(e => e.code)).toEqual(['cars2'])
    expect(findSimilarCodes({ kind: 'game', code: 'car' }, registry).map(e => e.code)).toEqual(['cars2'])
    expect(findSimilarCodes({ kind: 'game', code: 'dino' }, registry)).toEqual([])
  })
})
