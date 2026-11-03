// Лендинг Cars 2 (макет Антона, Figma 38:57). Тексты — ключи web.lp_cars2.* и общие common.*/ds.*; арт — в папке
// art по конвенции (small и wide); видео и значки сторов — копии из Pages Hub.
// Rive на первом экране нет: в макете его нет (решение пользователя); включается конфигом hero.rive
import type { LandingConfig } from '@amaya/landing-kit'
import { imageSetFromFiles } from '@amaya/ui'
import appStoreBadge from './art/app-store-badge.svg?url'
import video from './art/gameplay.mp4?url'
import googlePlayBadge from './art/google-play-badge.svg?url'
import logo from './art/logo.svg?url'

const art = import.meta.glob<string>('./art/*.{png,webp}', { query: '?url', import: 'default', eager: true })
const image = (name: string) => imageSetFromFiles(art, `./art/${name}`)
const K = 'web.lp_cars2'

export const cars2: LandingConfig = {
  id: 'cars2',
  theme: 'cars2',
  stores: {
    appStore: 'https://apps.apple.com/app/kids-car-games-police-car-fun/id1442848046',
    googlePlay: 'https://play.google.com/store/apps/details?id=com.amayasoft.cars.kids.racing.toddlers.garage.game'
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
  features: [1, 2, 3, 4].map(n => ({ art: image(`feature-${n}`), title: `${K}.features.item_${n}.title`, text: `${K}.features.item_${n}.text` })),
  video: { src: video, poster: image('poster'), label: 'ds.video.play.label' },
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
  // Закреплённой кнопки на этой странице нет — решение пользователя
  stickyCta: false
}
