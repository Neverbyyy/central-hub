// Общие данные историй Storybook — в одном месте, а не в каждой истории: арт, цены, тарифы Cars 2 и Farm, ключи.
// Цены — как в пресетах InApp (данные стора, не тексты); тексты — только ключи сервиса
import type { DsPlan } from '../types'

type T = (key: string, named?: Record<string, unknown>, plural?: number) => string

// Арт Cars 2 из InApp по конвенции 12 файлов (apps/storybook/public/demo) — только для историй
export const DEMO_ART = '/demo/cars2/cars2'

// Что под экраном в историях: под пейволлом Cars 2 — игра (здесь её заменяет тёмный фон, сверху ложится затемнение
// темы), Farm закрывает игру целиком. Это не токены — подложка Storybook
export const GAME_BACKDROP = 'linear-gradient(160deg, #3b6f9e, #1e3348)'
export const WHITE_BACKDROP = '#ffffff'

export const DEMO_PRICES = {
  cars2: { yearTrial: '$39.99', yearTrialWeek: '$0.77', year: '$34.99', yearWeek: '$0.67', weekTrial: '$9.99', pack: '$5.99' },
  farm: { year: '$49.99', yearWeek: '$0.96', week: '$9.99', month: '$19.99', yearTrial: '$99.99' }
}

const TRIAL_DAYS = 3

/** Тарифы Farm On start: год с плашкой и неделя (как в шаблоне PwPlusSplit, режим switch). */
export const farmSwitchPlans = (t: T): DsPlan[] => [
  { key: 'year', title: t('common.plan.yearly_access'), subtitle: t('common.price.just_per_year', { price: DEMO_PRICES.farm.year }), price: DEMO_PRICES.farm.yearWeek, period: t('common.period.per_week'), badge: t('common.badge.best_offer') },
  { key: 'week', title: t('common.plan.weekly_access'), price: DEMO_PRICES.farm.week, period: t('common.period.per_week') }
]

/** Тарифы Farm On click: неделя, месяц и год, у каждого свой цвет (режим trio). */
export const farmTrioPlans = (t: T): DsPlan[] => [
  { key: 'week', title: t('common.plan.weekly'), price: DEMO_PRICES.farm.week, period: t('common.period.per_week'), tint: 'sky', emphasis: true },
  { key: 'month', title: t('common.plan.monthly'), price: DEMO_PRICES.farm.month, period: t('common.period.per_month'), tint: 'violet', emphasis: true },
  { key: 'year', title: t('common.plan.yearly'), price: DEMO_PRICES.farm.yearTrial, period: t('common.period.per_year'), tint: 'pink', emphasis: true }
]

/** Тарифы попапа Cars 2: год с триалом, год, неделя с триалом (шаблон PwHeroSlider). */
export const cars2Plans = (t: T): DsPlan[] => {
  const free = t('common.trial.days_free', { days: TRIAL_DAYS }, TRIAL_DAYS)
  return [
    { key: 'year-trial', title: t('common.price.per_year_short', { price: DEMO_PRICES.cars2.yearTrial }), subtitle: t('common.price.just_per_week', { price: DEMO_PRICES.cars2.yearTrialWeek }), note: free },
    { key: 'year', title: t('common.price.per_year_short', { price: DEMO_PRICES.cars2.year }), subtitle: t('common.price.just_per_week', { price: DEMO_PRICES.cars2.yearWeek }) },
    { key: 'week', title: t('common.price.per_week_short', { price: DEMO_PRICES.cars2.weekTrial }), note: free }
  ]
}

// Преимущества Amaya Plus (Farm) и метки жанров (Cars 2) — ключи сервиса
export const FEATURE_KEYS = ['common.plus.feature.apps', 'common.plus.feature.hours', 'common.plus.feature.offline', 'common.plus.feature.updates']
export const TAGS = [
  { key: 'common.plus.tag.coloring_pages', tone: 'green' },
  { key: 'common.plus.tag.puzzles', tone: 'red' },
  { key: 'common.plus.tag.fairy_tales', tone: 'purple' },
  { key: 'common.plus.tag.animals', tone: 'blue' },
  { key: 'common.plus.tag.dinosaurs', tone: 'yellow' }
] as const

// Слайды Amaya Plus: ключ слайда → фон темы
export const PLUS_SLIDES = [
  { name: 'apps', bg: 'ds:bg-slide-sky' },
  { name: 'trusted', bg: 'ds:bg-slide-lime' },
  { name: 'privacy', bg: 'ds:bg-slide-yellow' },
  { name: 'educational', bg: 'ds:bg-slide-periwinkle' },
  { name: 'offline', bg: 'ds:bg-slide-lilac' }
]

export const APPS_COUNT = 25
