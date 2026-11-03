// Лендинг Farm (/farm). Макета нет (Антон прислал только Cars 2): собран из блоков Cars 2 без новых блоков —
// проверка дизайн-системы, как в ТЗ; сначала был только историей Storybook, теперь — страница стенда (та же история
// берёт этот конфиг). Тема farm (палитра Amaya Plus из base). Арт: первый экран — арт онбординга Farm (награды
// и звери, Figma 8:1369), преимущества — слайды Amaya Plus с их же текстами (common.plus.slide.*). Ролик — трейлер Farm
// (YouTube D92ck_F4PAw, 640×360, 30 с), постер — кадр с 6-й секунды (амбар): на первом кадре в ролик впечатана кнопка
// «▶» игры, а у DsVideo своя. Отзывы — настоящие из App Store, FAQ — по смыслу Cars 2 про Farm. Тексты — web.lp_farm.*.
// Значки сторов и логотип Amaya Kids — общие с Cars 2, из его папки (без копий)
import type { LandingConfig } from '@amaya/landing-kit'
import { imageSetFromFiles } from '@amaya/ui'
import appStoreBadge from '../cars2/art/app-store-badge.svg?url'
import googlePlayBadge from '../cars2/art/google-play-badge.svg?url'
import logo from '../cars2/art/logo.svg?url'
import video from './art/gameplay.mp4?url'

const art = import.meta.glob<string>('./art/*.{png,webp}', { query: '?url', import: 'default', eager: true })
const image = (name: string) => imageSetFromFiles(art, `./art/${name}`)
const K = 'web.lp_farm'
const SLIDES = ['trusted', 'privacy', 'educational', 'offline'] as const

export const farm: LandingConfig = {
  id: 'farm',
  theme: 'farm',
  stores: {
    // App Store — Pages Hub (useAppsInfo), Google Play — пакет Farm из данных InApp
    appStore: 'https://apps.apple.com/app/id1441292800',
    googlePlay: 'https://play.google.com/store/apps/details?id=com.amayasoft.my.first.animals.toddler.games.farm.animal.sounds'
  },
  badges: {
    appStore: appStoreBadge,
    googlePlay: googlePlayBadge,
    appStoreLabel: 'ds.store_badges.app_store.label',
    googlePlayLabel: 'ds.store_badges.google_play.label'
  },
  meta: { title: `${K}.meta.title`, description: `${K}.meta.description` },
  header: { logo, logoLabel: `${K}.header.logo` },
  hero: {
    art: image('hero'),
    title: `${K}.hero.title`,
    text: `${K}.hero.text`,
    note: `${K}.hero.stores_note`,
    advantages: [`${K}.hero.adv_1`, `${K}.hero.adv_2`]
  },
  cta: 'common.button.play_free',
  features: SLIDES.map((slide, index) => ({
    art: image(`feature-${index + 1}`),
    title: `common.plus.slide.${slide}.title`,
    text: `common.plus.slide.${slide}.text`
  })),
  video: { src: video, poster: image('poster'), label: 'ds.video.play.label' },
  // Отзывы — настоящие отзывы Farm из App Store (ники авторов — как там), как у Cars 2: 4 карточки
  reviews: {
    items: [1, 2, 3, 4].map(n => ({ text: `${K}.reviews.item_${n}.text`, author: `${K}.reviews.item_${n}.author`, rating: 5 })),
    ratingLabel: 'ds.rating.aria.label'
  },
  faq: {
    title: `${K}.faq.title`,
    items: [1, 2, 3, 4, 5].map(n => ({ id: `q${n}`, question: `${K}.faq.item_${n}.question`, answer: `${K}.faq.item_${n}.answer` }))
  },
  footer: {
    copyright: `${K}.footer.copyright`,
    rights: 'common.legal.all_rights_reserved',
    links: [
      { label: 'common.link.terms_of_use', href: 'https://amayakids.com/terms.html' },
      { label: 'common.link.privacy_policy', href: 'https://amayakids.com/privacy.html' }
    ]
  },
  stickyCta: false
}
