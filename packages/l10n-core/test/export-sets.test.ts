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

  // Набор ds (миграция ds_export_set_landings): все лендинги — одним началом web.lp_, новый сайт lp_<игра> — сам
  it('ds: web.lp_ берёт любой лендинг lp_<игра>, но не другие сайты', () => {
    const ds = { legacy_prefix: null, include_prefixes: ['common.', 'ds.', 'app.cars2.', 'app.farm.', 'brand.', 'web.lp_'], exclude_prefixes: [] }
    expect(keyInExportSet(ds, 'web.lp_cars2.hero.title')).toBe(true)
    expect(keyInExportSet(ds, 'web.lp_farm.reviews.item_1.text')).toBe(true)
    expect(keyInExportSet(ds, 'web.lp_dino.hero.title')).toBe(true)
    expect(keyInExportSet(ds, 'web.amayakids.home.hero.title')).toBe(false)
  })
})
