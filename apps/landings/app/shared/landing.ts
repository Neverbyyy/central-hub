// Общее у лендингов Amaya Kids: логотип, значки сторов, документы и схема ключей web.<сайт>.*. Лендинг задаёт только
// своё. Папка вне app/landings: там каждая папка — лендинг (nuxt.config). Импорт в конфигах — относительный,
// их читает и Storybook, где алиаса Nuxt нет
import type { LandingConfig, LandingRoad } from '@amaya/landing-kit'
import type { DsImageSet } from '@amaya/ui'
import appStoreBadge from './art/app-store-badge.svg?url'
import googlePlayBadge from './art/google-play-badge.svg?url'
import logo from './art/logo.svg?url'

const LEGAL = { terms: 'https://amayakids.com/terms.html', privacy: 'https://amayakids.com/privacy.html' }

const numbers = (count: number) => Array.from({ length: count }, (_, index) => index + 1)

// Своё у дорожной раскладки — только арт; ключи текстов строятся по схеме <сайт>.wash.*, <сайт>.worlds.* и так далее
export interface RoadOptions {
  scene: LandingRoad['scene']
  truck: DsImageSet
  truckRatio: string
  worlds: DsImageSet[]
  balloons: LandingRoad['finish']['balloons']
}

function roadTexts(site: string, { scene, truck, truckRatio, worlds, balloons }: RoadOptions): LandingRoad {
  return {
    scene,
    wash: {
      art: truck,
      ratio: truckRatio,
      title: `${site}.wash.title`,
      text: `${site}.wash.text`,
      cleanTitle: `${site}.wash.clean_title`,
      done: `${site}.wash.done`,
      again: `${site}.wash.again`,
      label: `${site}.wash.label`
    },
    worlds: { title: `${site}.worlds.title`, text: `${site}.worlds.text`, items: worlds },
    featuresTitle: `${site}.features.title`,
    videoTitle: `${site}.video.title`,
    reviewsTitle: `${site}.reviews.title`,
    finish: { title: `${site}.finish.title`, text: `${site}.finish.text`, balloons }
  }
}

export interface LandingOptions extends Pick<LandingConfig, 'id' | 'theme' | 'stores' | 'features' | 'stickyCta'> {
  // Начало ключей сайта: web.lp_cars2
  site: string
  // false — без кнопки «Play for free»: вход в стор только значками
  cta?: false
  // Начало ключей, общих с другим лендингом той же игры: отзывы, FAQ, футер, описание. По умолчанию — site
  shared?: string
  heroArt: DsImageSet
  heroRive?: LandingConfig['hero']['rive']
  video: { src: string, poster: DsImageSet }
  // Сколько отзывов и вопросов: ключи reviews.item_N.*, faq.item_N.*
  reviews: number
  faq: number
  road?: RoadOptions
}

export function defineLanding({ site, shared = site, cta, heroArt, heroRive, video, reviews, faq, road, ...own }: LandingOptions): LandingConfig {
  return {
    ...own,
    road: road && roadTexts(site, road),
    badges: {
      appStore: appStoreBadge,
      googlePlay: googlePlayBadge,
      appStoreLabel: 'ds.store_badges.app_store.label',
      googlePlayLabel: 'ds.store_badges.google_play.label'
    },
    meta: { title: `${site}.meta.title`, description: `${shared}.meta.description` },
    header: { logo, logoLabel: `${shared}.header.logo` },
    hero: {
      art: heroArt,
      rive: heroRive,
      title: `${site}.hero.title`,
      text: `${site}.hero.text`,
      note: `${shared}.hero.stores_note`,
      advantages: [`${shared}.hero.adv_1`, `${shared}.hero.adv_2`]
    },
    cta: cta === false ? undefined : 'common.button.play_free',
    video: { ...video, label: 'ds.video.play.label' },
    reviews: {
      items: numbers(reviews).map(n => ({ text: `${shared}.reviews.item_${n}.text`, author: `${shared}.reviews.item_${n}.author`, rating: 5 })),
      ratingLabel: 'ds.rating.aria.label'
    },
    faq: {
      title: `${shared}.faq.title`,
      items: numbers(faq).map(n => ({ id: `q${n}`, question: `${shared}.faq.item_${n}.question`, answer: `${shared}.faq.item_${n}.answer` }))
    },
    footer: {
      copyright: `${shared}.footer.copyright`,
      rights: 'common.legal.all_rights_reserved',
      links: [
        { label: 'common.link.terms_of_use', href: LEGAL.terms },
        { label: 'common.link.privacy_policy', href: LEGAL.privacy }
      ]
    }
  }
}
