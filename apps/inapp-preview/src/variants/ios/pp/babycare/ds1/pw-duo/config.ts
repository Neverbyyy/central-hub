// Пейволл Baby Care «Paywall B» (Figma 96:21) — редизайн InApp ios/pp/babycare/tm1/pw-duo, вариант B:
// год без триала с плашкой и неделя с триалом на 3 дня. Здесь то, что меняется от игры к игре: тема, продукты,
// ключи текстов и арт; раскладка экрана — в index.vue
import { imageSetFromFiles, type DsImageSet, type DsTheme } from '@amaya/ui'

const files = import.meta.glob<string>('./art/*.{png,webp}', { eager: true, query: '?url', import: 'default' })

export interface DuoConfig {
  theme: DsTheme
  // Дней триала у недельного продукта
  trialDays: number
  // Продукты InApp (useConfig, com.slamsoft.mybabycare: ios.tm1.varb.*)
  products: {
    yearNoTrial: string
    weekTrial: string
  }
  art: DsImageSet
  texts: {
    title: string
    features: string[]
    yearly: string
    weekly: string
    justPerYear: string
    perWeek: string
    daysFree: string
    thenPrice: string
    bestOffer: string
    continue: string
    tryFree: string
    cancelAnytime: string
    noPaymentNow: string
    terms: string
    privacy: string
    restore: string
    plans: string
    close: string
  }
}

export const config: DuoConfig = {
  theme: 'babycare',
  trialDays: 3,
  products: {
    yearNoTrial: 'com.slamsoft.mybabycare.yearly.notrial.1299',
    weekTrial: 'com.slamsoft.mybabycare.weekly.trial3.299'
  },
  // Арт один на все размеры: вертикальный экран берёт small (во всю ширину, до 768 на iPad)
  art: imageSetFromFiles(files, './art/hero'),
  // Всё, кроме двух пунктов списка и «then {price}», — общие строки пейволлов
  texts: {
    title: 'common.plus.title.unlimited',
    features: ['common.plus.feature.activities', 'common.plus.feature.safe_fun', 'common.plus.feature.offline'],
    yearly: 'common.plan.yearly',
    weekly: 'common.plan.weekly',
    justPerYear: 'common.price.just_per_year',
    perWeek: 'common.period.per_week',
    daysFree: 'common.trial.days_free',
    thenPrice: 'common.trial.then_price',
    bestOffer: 'common.badge.best_offer',
    continue: 'common.button.continue.default',
    tryFree: 'common.button.try_free',
    cancelAnytime: 'common.legal.cancel_anytime',
    noPaymentNow: 'common.legal.no_payment_now',
    terms: 'common.link.terms_of_use',
    privacy: 'common.link.privacy_policy',
    restore: 'common.button.restore',
    plans: 'common.plan.group_label',
    close: 'ds.close_button.aria.label'
  }
}
