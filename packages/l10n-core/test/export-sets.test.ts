import { describe, expect, it } from 'vitest'
import { keyInExportSet } from '../src'

// Как наборы заведены в базе (миграции export_sets и keys_and_mcp)
const inapp = { legacy_prefix: 'legacy.inapp.', include_prefixes: ['common.', 'app.', 'brand.', 'ds.', 'test.'], exclude_prefixes: ['common.selftest.'] }
const pagesHub = { legacy_prefix: 'legacy.pages_hub.', include_prefixes: ['common.', 'web.', 'brand.', 'ds.', 'test.'], exclude_prefixes: ['common.selftest.'] }

describe('keyInExportSet', () => {
  it.each([
    ['app.farm.banner.title', true, false],
    ['web.lp_cars2.home.hero.title', false, true],
    ['common.button.continue.default', true, true],
    ['legacy.inapp.allapps_button', true, false],
    ['legacy.pages_hub.a.gift_card.common.gift_card_code', false, true],
    ['common.selftest.anchor.default', false, false]
  ])('%s → InApp %s, Pages Hub %s', (key, toInapp, toPagesHub) => {
    expect(keyInExportSet(inapp, key)).toBe(toInapp)
    expect(keyInExportSet(pagesHub, key)).toBe(toPagesHub)
  })

  it('начало без точки не путается с похожим: application. — не app.', () => {
    expect(keyInExportSet(inapp, 'application.x.y')).toBe(false)
  })
})
