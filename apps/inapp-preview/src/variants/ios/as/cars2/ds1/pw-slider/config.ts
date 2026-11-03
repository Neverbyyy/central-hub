// Пейволл Cars 2 на дизайн-системе: редизайн InApp ios/as/cars2/tm11/pw-slider (вариант B).
// Те же продукты, тот же смысл текстов, те же события — меняется только вид. Арт — из InApp, по конвенции 12 файлов
import type { HeroLive, HeroSliderConfig } from '@amaya/paywall-kit'
import { imageSetFromFiles } from '@amaya/ui'
import animation from './art/animation-paywall-cars.riv?url'

const files = import.meta.glob<string>('./art/**/*.{png,webp}', { eager: true, query: '?url', import: 'default' })
const art = (name: string) => imageSetFromFiles(files, `./art/${name}`)

/**
 * Живая карточка — Rive из ТЗ (въезжают машины, енот машет ключом). Пока не включена: в артборде нет плиток-иконок,
 * которые есть на карточке в макете, а отдельным слоем их в Figma нет — попросили у Антона. Пришлёт прозрачный
 * слой — положить в art/ как tiles-* и включить: art: { …, live: { ...live, overlay: art('tiles') } }.
 * Сравнить с картинкой — история «Пейволлы / Cars 2 · с Rive».
 */
export const live: HeroLive = { src: animation, artboard: 'paywall-without-icons', stateMachine: 'State Machine 1' }

// Наборы машин в карусели — в порядке InApp
const UNLOCKS = ['city', 'christmas', 'halloween', 'construction', 'modern', 'zoo', 'monstertrucks'] as const
const unlockIds = Object.fromEntries(UNLOCKS.map(name => [name, `com.amayasoft.cars2.${name}.599`]))

export const config: HeroSliderConfig = {
  theme: 'cars2',
  trialDays: 3,
  appsCount: 20,
  // Подписки Cars 2 (InApp isOnlyAll): с любой из них разовые наборы не предлагаем
  subscriptions: [
    'com.amayasoft.cars2.yearly.notrial',
    'com.amayasoft.cars2.weekly.trial3',
    'com.amayasoft.cars2.weekly.notrial.899',
    'com.amayasoft.cars2.yearly.trial3',
    'com.amayasoft.cars2.yearly.notrial.3999',
    'com.amayasoft.cars2.weekly.trial3.799',
    'com.amayasoft.cars2.weekly.notrial.699',
    'com.amayasoft.cars2.yearly.trial3.7999',
    'com.amayasoft.cars2.yearly.trial3.4999',
    'com.amayasoft.cars2.weekly.trial3.onstart'
  ],
  unlocks: UNLOCKS.map(name => ({
    key: name,
    art: art(`unlock/${name}`),
    sameProducts: [`com.amayasoft.cars2.${name}`, `com.amayasoft.cars2.${name}.499`]
  })),
  // Сегменты InApp (useConfig, ios.tm11.varb.*): t1 и u — одни цены, wout1 — дешевле
  segments: {
    t1: {
      yearTrial: 'com.amayasoft.cars2.yearly.trial3.3999',
      yearNoTrial: 'com.amayasoft.cars2.yearly.notrial.3499',
      weekTrial: 'com.amayasoft.cars2.weekly.trial3',
      unlocks: unlockIds
    },
    u: {
      yearTrial: 'com.amayasoft.cars2.yearly.trial3.3999',
      yearNoTrial: 'com.amayasoft.cars2.yearly.notrial.3499',
      weekTrial: 'com.amayasoft.cars2.weekly.trial3',
      unlocks: unlockIds
    },
    wout1: {
      yearTrial: 'com.amayasoft.cars2.yearly.trial3.2999',
      yearNoTrial: 'com.amayasoft.cars2.yearly.notrial.2499',
      weekTrial: 'com.amayasoft.cars2.weekly.trial3.799',
      unlocks: unlockIds
    }
  },
  defaultSegment: 't1',
  art: {
    front: art('front'),
    back: art('back'),
    balloons: art('balloons'),
    gameIcon: art('icons/raccoon'),
    appIcons: ['five', 'dino', 'coloring', 'music', 'alphabet'].map(name => art(`icons/${name}`)),
    popup: {
      bg: art('popup/bg'),
      top: art('popup/robot'),
      left: art('popup/cars-left'),
      right: art('popup/cars-right'),
      balloon: art('popup/balon'),
      key: art('popup/kluth')
    }
  },
  // Только ключи сервиса: свои у Cars 2 — заголовок и первая карточка оборота, остальное общее
  texts: {
    titleLead: 'app.cars2.paywall.title.all_cars',
    titleAnd: 'app.cars2.paywall.title.and_apps',
    titleApps: 'app.cars2.paywall.title.apps',
    titleTail: 'app.cars2.paywall.title.subscription',
    pricePerWeek: 'common.price.per_week',
    justPerYear: 'common.price.just_per_year',
    pricePerYear: 'common.price.per_year',
    tryFreeDays: 'common.button.try_free_days',
    unlockFor: 'common.button.unlock_for',
    morePlans: 'common.link.more_plans',
    back: 'common.button.back',
    info: 'common.button.whats_included',
    infoCars: 'app.cars2.paywall.info.cars',
    infoNoAds: 'common.benefit.no_ads',
    infoNoPayments: 'common.benefit.no_extra_payments',
    infoApps: 'common.plus.info.apps',
    infoAudience: 'common.plus.info.audience',
    infoBoys: 'common.plus.info.boys',
    infoGirls: 'common.plus.info.girls',
    tags: ['common.plus.tag.coloring_pages', 'common.plus.tag.puzzles', 'common.plus.tag.fairy_tales', 'common.plus.tag.animals', 'common.plus.tag.dinosaurs'],
    plans: 'common.plan.group_label',
    planPerYear: 'common.price.per_year_short',
    planPerWeek: 'common.price.per_week_short',
    justPerWeek: 'common.price.just_per_week',
    daysFree: 'common.trial.days_free',
    tryFree: 'common.button.try_free',
    unlock: 'common.button.unlock',
    terms: 'common.link.terms_of_use',
    restore: 'common.button.restore',
    close: 'ds.close_button.aria.label'
  }
}
