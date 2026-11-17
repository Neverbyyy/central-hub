// Сначала дизайн-система, потом рабочие проекты: когда рабочий набор ждёт проверку (reviewGate)
import { describe, expect, it } from 'vitest'
import { exportProjectList, reviewGate, reviewGateMessage, type ReviewPreview } from '../../apps/central-hub/shared/utils/exportSets'

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

describe('reviewGateMessage', () => {
  it('одна фраза для окна и сервера: сколько общих ключей ждут; не все строки пришли — с плюсом; ни одного видимого — «много изменений»', () => {
    expect(reviewGateMessage('ds', { keys: ['a'], truncated: false })).toBe('Сначала — «Дизайн-система»: 1 общий ключ ещё не в её основной ветке')
    expect(reviewGateMessage('ds', { keys: ['a', 'b', 'c'], truncated: false })).toContain(': 3 общих ключа ещё')
    expect(reviewGateMessage('ds', { keys: ['a', 'b', 'c', 'd', 'e'], truncated: true })).toContain(': 5+ общих ключей ещё')
    expect(reviewGateMessage('ds', { keys: [], truncated: true })).toContain(': много изменений ещё')
  })

  it('проверка недоступна — так и говорим, с понятной причиной', () => {
    expect(reviewGateMessage('ds', 'not-connected')).toBe('Сначала — «Дизайн-система», но она не подключена к GitHub')
    expect(reviewGateMessage('ds', 'failed')).toBe('Сначала — «Дизайн-система», но сравнить её с репозиторием не получилось')
  })
})

describe('exportProjectList', () => {
  it('наборы по-человечески одной строкой', () => {
    expect(exportProjectList(['inapp'])).toBe('InApp')
    expect(exportProjectList(['inapp', 'pages_hub'])).toBe('InApp и Pages Hub')
    expect(exportProjectList([])).toBe('')
  })
})
