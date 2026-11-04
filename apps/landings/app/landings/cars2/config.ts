// Лендинг Cars 2 (макет Антона, Figma 38:57). Тексты — ключи web.lp_cars2.*; арт — в папке art по конвенции
// (small и wide), ролик — копия из Pages Hub. Rive на первом экране нет: в макете его нет (решение пользователя)
import { imageSetFromFiles } from '@amaya/ui'
import { defineLanding } from '../../shared/landing'
import video from './art/gameplay.mp4?url'

const art = import.meta.glob<string>('./art/*.webp', { query: '?url', import: 'default', eager: true })
const image = (name: string) => imageSetFromFiles(art, `./art/${name}`)
const site = 'web.lp_cars2'

export default defineLanding({
  id: 'cars2',
  site,
  theme: 'cars2',
  stores: {
    appStore: 'https://apps.apple.com/app/kids-car-games-police-car-fun/id1442848046',
    googlePlay: 'https://play.google.com/store/apps/details?id=com.amayasoft.cars.kids.racing.toddlers.garage.game'
  },
  heroArt: image('hero'),
  features: [1, 2, 3, 4].map(n => ({ art: image(`feature-${n}`), title: `${site}.features.item_${n}.title`, text: `${site}.features.item_${n}.text` })),
  video: { src: video, poster: image('poster') },
  reviews: 4,
  faq: 5
})
