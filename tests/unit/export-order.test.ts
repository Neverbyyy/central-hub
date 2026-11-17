// Сначала дизайн-система, потом рабочие проекты: когда рабочий набор ждёт проверку (reviewGate)
import { describe, expect, it } from 'vitest'
import { reviewBlockText, reviewGate, type ReviewPreview } from '../../apps/central-hub/shared/utils/exportSets'

// Префиксы как в базе: InApp и Pages Hub (миграции export_sets)
const inapp = {
  legacy_prefix: 'legacy.inapp.',
  include_prefixes: ['common.', 'app.', 'brand.', 'ds.', 'test.'],
  exclude_prefixes: ['common.selftest.']
}
const pagesHub = {
  legacy_prefix: 'legacy.pages_hub.',
  include_prefixes: ['common.', 'web.', 'brand.', 'ds.', 'test.'],
  exclude_prefixes: ['common.selftest.']
}

// Предпросмотр дизайн-системы: ключи, которых ещё нет в её основной ветке, по файлам языков
const preview = (keys: string[], { truncated = false, langs = ['en', 'ru'] } = {}): ReviewPreview => ({
  outcome: keys.length || truncated ? 'ready' : 'unchanged',
  changes: langs.map(() => ({ lines: keys.map(key => ({ key })), ...(truncated ? { truncated: true } : {}) }))
})

describe('reviewGate', () => {
  it('держит, пока общие ключи не в основной ветке дизайн-системы — каждый ключ один раз на все языки', () => {
    expect(reviewGate(inapp, preview(['app.cars2.paywall.title', 'common.button.continue.default']))).toEqual({
      keys: ['app.cars2.paywall.title', 'common.button.continue.default'],
      truncated: false
    })
  })

  it('дизайн-система актуальна — можно выгружать', () => {
    expect(reviewGate(inapp, preview([]))).toBeNull()
    expect(reviewGate(pagesHub, { outcome: 'unchanged', changes: [] })).toBeNull()
  })

  it('правка лендинга не держит InApp, но держит Pages Hub', () => {
    const landing = preview(['web.lp_cars2.home.hero.title'])
    expect(reviewGate(inapp, landing)).toBeNull()
    expect(reviewGate(pagesHub, landing)?.keys).toEqual(['web.lp_cars2.home.hero.title'])
  })

  it('исключённые ключи набора не держат', () => {
    expect(reviewGate(inapp, preview(['common.selftest.probe']))).toBeNull()
  })

  it('строк слишком много и сервер отдал не все — держим, даже если среди видимых общих нет', () => {
    expect(reviewGate(inapp, preview(['web.lp_farm.title'], { truncated: true }))).toEqual({ keys: [], truncated: true })
  })
})

describe('reviewBlockText', () => {
  it('сколько общих ключей ждут; не все строки пришли — с плюсом; ни одного видимого — «много изменений»', () => {
    expect(reviewBlockText({ keys: ['a'], truncated: false })).toBe('1 общий ключ')
    expect(reviewBlockText({ keys: ['a', 'b', 'c'], truncated: false })).toBe('3 общих ключа')
    expect(reviewBlockText({ keys: ['a', 'b', 'c', 'd', 'e'], truncated: true })).toBe('5+ общих ключей')
    expect(reviewBlockText({ keys: [], truncated: true })).toBe('много изменений')
  })
})
