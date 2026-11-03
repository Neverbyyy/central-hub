// Конфиг экрана: новый пейволл — это конфиг (тема, шаблон, продукты, ключи текстов, картинки), а не копия вёрстки.
// Тексты — только ключи сервиса локализации; шаблон переводит их сам через vue-i18n приложения.
import type { DsImageSet, DsTheme } from '@amaya/ui'

/**
 * Сегмент цен из имени варианта InApp: ios_as_farm_tm4_varb_ut1_pw_trio_v1 → ut1. У InApp у одного экрана
 * разные продукты для сегментов пользователей (t1, u, ut1, wout1) — ищем «_<сегмент>_» в имени варианта.
 */
export function resolveSegment<T>(segments: Record<string, T>, variant: string | undefined, fallback: string): T {
  const name = Object.keys(segments).find(segment => variant?.includes(`_${segment}_`))
  return segments[name ?? fallback] ?? segments[fallback]!
}

// --- Шаблон Amaya Plus: слайды слева, тарифы справа (Farm On start / On click) ---

export interface PlusSlide {
  // Ключи заголовка и текста слайда
  title: string
  text: string
  art: DsImageSet
  // Фон слайда — токен color.slide.*
  bg: 'sky' | 'lime' | 'yellow' | 'periwinkle' | 'lilac'
}

// Ключи текстов шаблона Amaya Plus. Общие для всех игр — в common.*, конфиг может заменить любой
export interface PlusTexts {
  titleUnlimited: string
  titleUnlimitedApps: string
  titleAnyPlanFree: string
  features: string[]
  freeTrial: string
  yearlyAccess: string
  weeklyAccess: string
  weekly: string
  monthly: string
  yearly: string
  justPerYear: string
  perWeek: string
  perMonth: string
  perYear: string
  bestOffer: string
  daysFree: string
  continue: string
  tryFree: string
  cancelAnytime: string
  noPaymentNow: string
  thenPerWeek: string
  thenPerMonth: string
  thenPerYear: string
  fullAccess: string
  terms: string
  restore: string
  close: string
  plans: string
  slide: string
  logo: string
}

export const PLUS_TEXTS: PlusTexts = {
  titleUnlimited: 'common.plus.title.unlimited',
  titleUnlimitedApps: 'common.plus.title.unlimited_apps',
  titleAnyPlanFree: 'common.trial.any_plan_free',
  features: ['common.plus.feature.apps', 'common.plus.feature.hours', 'common.plus.feature.offline', 'common.plus.feature.updates'],
  freeTrial: 'common.trial.free_trial',
  yearlyAccess: 'common.plan.yearly_access',
  weeklyAccess: 'common.plan.weekly_access',
  weekly: 'common.plan.weekly',
  monthly: 'common.plan.monthly',
  yearly: 'common.plan.yearly',
  justPerYear: 'common.price.just_per_year',
  perWeek: 'common.period.per_week',
  perMonth: 'common.period.per_month',
  perYear: 'common.period.per_year',
  bestOffer: 'common.badge.best_offer',
  daysFree: 'common.trial.days_free',
  continue: 'common.button.continue.default',
  tryFree: 'common.button.try_free',
  cancelAnytime: 'common.legal.cancel_anytime',
  noPaymentNow: 'common.legal.no_payment_now',
  thenPerWeek: 'common.trial.then_per_week',
  thenPerMonth: 'common.trial.then_per_month',
  thenPerYear: 'common.trial.then_per_year',
  fullAccess: 'common.plus.full_access',
  terms: 'common.link.terms_of_use',
  restore: 'common.button.restore',
  close: 'ds.close_button.aria.label',
  plans: 'common.plan.group_label',
  slide: 'ds.slides.dot.label',
  logo: 'common.plus.logo.label'
}

interface PlusConfigBase<Products> {
  theme: DsTheme
  // «25+ apps»: сколько приложений в подписке
  appsCount: number
  // Дней триала у продуктов с триалом
  trialDays: number
  // Логотип Amaya Plus (SVG)
  logo: string
  slides: PlusSlide[]
  // Продукты по сегментам InApp; без сегмента в имени варианта — defaultSegment
  segments: Record<string, Products>
  defaultSegment: string
  texts?: Partial<PlusTexts>
}

// On start: год без триала + неделя; тумблер «Free trial» меняет неделю на неделю с триалом (InApp farm tm4 pw-switch)
export interface PlusSwitchProducts {
  yearNoTrial: string
  weekNoTrial: string
  weekTrial: string
}

export interface PlusSwitchConfig extends PlusConfigBase<PlusSwitchProducts> {
  mode: 'switch'
}

// On click: неделя, месяц, год — все с триалом, у каждого свой цвет (InApp farm tm4 pw-trio)
export interface PlusTrioProducts {
  week: string
  month: string
  year: string
}

export interface PlusTrioConfig extends PlusConfigBase<PlusTrioProducts> {
  mode: 'trio'
}

export type PlusConfig = PlusSwitchConfig | PlusTrioConfig

// --- Шаблон «главная карточка и карусель наборов» (Cars 2, InApp cars2 tm11 pw-slider, вариант B) ---

// Ключи текстов шаблона. Заголовок — из частей, как в InApp: «All cars» / «and {apps}» / «in ONE subscription!»
export interface HeroTexts {
  titleLead: string
  titleAnd: string
  titleApps: string
  titleTail: string
  pricePerWeek: string
  justPerYear: string
  pricePerYear: string
  tryFreeDays: string
  unlockFor: string
  morePlans: string
  back: string
  info: string
  infoCars: string
  infoNoAds: string
  infoNoPayments: string
  infoApps: string
  infoAudience: string
  infoBoys: string
  infoGirls: string
  tags: string[]
  plans: string
  planPerYear: string
  planPerWeek: string
  justPerWeek: string
  daysFree: string
  tryFree: string
  unlock: string
  terms: string
  restore: string
  close: string
}

export interface HeroSliderProducts {
  // Год с триалом и без, неделя с триалом (у кого триал уже был — стор просто не даст его снова)
  yearTrial: string
  yearNoTrial: string
  weekTrial: string
  // Разовые наборы: ключ набора → ID продукта
  unlocks: Record<string, string>
}

export interface HeroUnlock {
  key: string
  art: DsImageSet
  // Тот же набор под другими ID (старые цены): если куплен любой, карточку не показываем
  sameProducts?: string[]
}

export interface HeroArt {
  // Лицевая сторона главной карточки и оборот
  front: DsImageSet
  back: DsImageSet
  // Воздушные шары над левым верхним углом карточки
  balloons: DsImageSet
  // Иконка игры и иконки других приложений на обороте
  gameIcon: DsImageSet
  appIcons: DsImageSet[]
  // Попап тарифов: фон и украшения
  popup: { bg: DsImageSet, top: DsImageSet, left: DsImageSet, right: DsImageSet, balloon: DsImageSet, key: DsImageSet }
  // Живая лицевая сторона: Rive поверх front (front остаётся постером: экран «готов» без анимации) и слой поверх
  // анимации — то, чего в ней нет (плитки-иконки у animation-paywall-cars.riv, артборд paywall-without-icons)
  live?: HeroLive
}

export interface HeroLive {
  // Адрес .riv: import animation from './art/animation.riv?url'
  src: string
  artboard?: string
  stateMachine?: string
  // Прозрачная картинка поверх анимации
  overlay?: DsImageSet
}

export interface HeroSliderConfig {
  theme: DsTheme
  trialDays: number
  // «20+ fun apps»
  appsCount: number
  // Подписки игры: если куплена любая, разовые наборы не предлагаем (InApp isOnlyAll)
  subscriptions: string[]
  unlocks: HeroUnlock[]
  segments: Record<string, HeroSliderProducts>
  defaultSegment: string
  art: HeroArt
  texts: HeroTexts
}
