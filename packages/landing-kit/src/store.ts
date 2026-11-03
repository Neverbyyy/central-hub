// Ссылки в сторы с UTM из адреса лендинга: человек пришёл из рекламы с utm_* — они уходят дальше в стор.
// Google Play передаёт метки в приложение и в консоль стора через параметр referrer (одной закодированной строкой).
// App Store метки в ссылке не читает: кампанию он берёт из ct (campaign token) — туда идёт utm_campaign, а без неё
// utm_source; сами utm_* остаются в ссылке как есть, их видят редиректы и аналитика по ссылке

export const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const
export type Utm = Partial<Record<typeof UTM_KEYS[number], string>>

export interface StoreUrls {
  appStore: string
  googlePlay: string
}

// Длиннее не бывает у честной метки; ct у Apple — до 40 символов
const UTM_MAX = 255
const CT_MAX = 40

/** utm_* из строки запроса: только непустые, обрезанные по длине. */
export function readUtm(search: string): Utm {
  const params = new URLSearchParams(search)
  const utm: Utm = {}
  for (const key of UTM_KEYS) {
    const value = params.get(key)?.trim()
    if (value) utm[key] = value.slice(0, UTM_MAX)
  }
  return utm
}

const hasUtm = (utm: Utm) => Object.keys(utm).length > 0

export function appStoreLink(base: string, utm: Utm): string {
  if (!hasUtm(utm)) return base
  const url = new URL(base)
  for (const [key, value] of Object.entries(utm)) url.searchParams.set(key, value)
  const campaign = utm.utm_campaign ?? utm.utm_source
  if (campaign) url.searchParams.set('ct', campaign.slice(0, CT_MAX))
  return url.toString()
}

export function googlePlayLink(base: string, utm: Utm): string {
  if (!hasUtm(utm)) return base
  const url = new URL(base)
  url.searchParams.set('referrer', new URLSearchParams(utm as Record<string, string>).toString())
  return url.toString()
}

/** Обе ссылки с UTM из строки запроса лендинга. */
export function storeLinks(stores: StoreUrls, search: string): StoreUrls {
  const utm = readUtm(search)
  return { appStore: appStoreLink(stores.appStore, utm), googlePlay: googlePlayLink(stores.googlePlay, utm) }
}
