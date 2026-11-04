// Общее у лендингов Amaya Kids: логотип, значки сторов, документы и схема ключей web.<сайт>.*. Лендинг задаёт только
// своё. Папка вне app/landings: там каждая папка — лендинг (nuxt.config). Импорт в конфигах — относительный,
// их читает и Storybook, где алиаса Nuxt нет
import type { LandingConfig } from '@amaya/landing-kit'
import type { DsImageSet } from '@amaya/ui'
import appStoreBadge from './art/app-store-badge.svg?url'
import googlePlayBadge from './art/google-play-badge.svg?url'
import logo from './art/logo.svg?url'

const LEGAL = { terms: 'https://amayakids.com/terms.html', privacy: 'https://amayakids.com/privacy.html' }

const numbers = (count: number) => Array.from({ length: count }, (_, index) => index + 1)

export interface LandingOptions extends Pick<LandingConfig, 'id' | 'theme' | 'stores' | 'features' | 'stickyCta'> {
  // Начало ключей сайта: web.lp_cars2
  site: string
  heroArt: DsImageSet
  heroRive?: LandingConfig['hero']['rive']
  video: { src: string, poster: DsImageSet }
  // Сколько отзывов и вопросов: ключи reviews.item_N.*, faq.item_N.*
  reviews: number
  faq: number
}

export function defineLanding({ site, heroArt, heroRive, video, reviews, faq, ...own }: LandingOptions): LandingConfig {
  return {
    ...own,
    badges: {
      appStore: appStoreBadge,
      googlePlay: googlePlayBadge,
      appStoreLabel: 'ds.store_badges.app_store.label',
      googlePlayLabel: 'ds.store_badges.google_play.label'
    },
    meta: { title: `${site}.meta.title`, description: `${site}.meta.description` },
    header: { logo, logoLabel: `${site}.header.logo` },
    hero: {
      art: heroArt,
      rive: heroRive,
      title: `${site}.hero.title`,
      text: `${site}.hero.text`,
      note: `${site}.hero.stores_note`,
      advantages: [`${site}.hero.adv_1`, `${site}.hero.adv_2`]
    },
    cta: 'common.button.play_free',
    video: { ...video, label: 'ds.video.play.label' },
    reviews: {
      items: numbers(reviews).map(n => ({ text: `${site}.reviews.item_${n}.text`, author: `${site}.reviews.item_${n}.author`, rating: 5 })),
      ratingLabel: 'ds.rating.aria.label'
    },
    faq: {
      title: `${site}.faq.title`,
      items: numbers(faq).map(n => ({ id: `q${n}`, question: `${site}.faq.item_${n}.question`, answer: `${site}.faq.item_${n}.answer` }))
    },
    footer: {
      copyright: `${site}.footer.copyright`,
      rights: 'common.legal.all_rights_reserved',
      links: [
        { label: 'common.link.terms_of_use', href: LEGAL.terms },
        { label: 'common.link.privacy_policy', href: LEGAL.privacy }
      ]
    }
  }
}
