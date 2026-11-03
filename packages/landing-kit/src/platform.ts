// Платформа посетителя — чтобы главная кнопка вела в нужный стор. iPadOS 13+ в Safari представляется
// компьютером Mac (UA без «iPad»), его выдаёт сенсорный экран: у настоящего Mac maxTouchPoints = 0

export type Platform = 'ios' | 'android' | 'other'

export interface NavigatorLike {
  userAgent: string
  platform?: string
  maxTouchPoints?: number
}

export function detectPlatform(nav: NavigatorLike): Platform {
  const ua = nav.userAgent
  if (/android/i.test(ua)) return 'android'
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios'
  if (nav.platform === 'MacIntel' && (nav.maxTouchPoints ?? 0) > 1) return 'ios'
  return 'other'
}
