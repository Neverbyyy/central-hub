import { describe, expect, it } from 'vitest'
import { appStoreLink, googlePlayLink, readUtm, storeLinks } from '../src/store'

const STORES = {
  appStore: 'https://apps.apple.com/app/kids-car-games-police-car-fun/id1442848046',
  googlePlay: 'https://play.google.com/store/apps/details?id=com.amayasoft.cars.kids.racing.toddlers.garage.game'
}

describe('ссылки в сторы с UTM', () => {
  it('readUtm: только utm_*, непустые, обрезанные', () => {
    expect(readUtm('?utm_source=fb&utm_medium=%20&utm_campaign=cars2_uz&gclid=x&lang=ru')).toEqual({ utm_source: 'fb', utm_campaign: 'cars2_uz' })
    expect(readUtm('')).toEqual({})
    expect(readUtm(`?utm_content=${'a'.repeat(300)}`).utm_content).toHaveLength(255)
  })

  it('без меток ссылки не меняются', () => {
    expect(storeLinks(STORES, '?lang=ru')).toEqual(STORES)
  })

  it('App Store: utm_* как есть и ct — кампания (до 40 символов)', () => {
    const url = new URL(appStoreLink(STORES.appStore, { utm_source: 'fb', utm_campaign: 'cars2 promo' }))
    expect(url.origin + url.pathname).toBe(STORES.appStore)
    expect(url.searchParams.get('utm_source')).toBe('fb')
    expect(url.searchParams.get('ct')).toBe('cars2 promo')
    expect(new URL(appStoreLink(STORES.appStore, { utm_source: 'tiktok' })).searchParams.get('ct')).toBe('tiktok')
    expect(new URL(appStoreLink(STORES.appStore, { utm_campaign: 'x'.repeat(60) })).searchParams.get('ct')).toHaveLength(40)
  })

  it('Google Play: метки одной строкой в referrer, id приложения остаётся', () => {
    const url = new URL(googlePlayLink(STORES.googlePlay, { utm_source: 'fb', utm_campaign: 'cars2&uz' }))
    expect(url.searchParams.get('id')).toBe('com.amayasoft.cars.kids.racing.toddlers.garage.game')
    expect(url.searchParams.get('referrer')).toBe('utm_source=fb&utm_campaign=cars2%26uz')
    expect(new URLSearchParams(url.searchParams.get('referrer')!).get('utm_campaign')).toBe('cars2&uz')
  })
})
