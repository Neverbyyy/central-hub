// Лендинг Farm (/farm). Макета нет (Антон прислал только Cars 2): собран из блоков Cars 2 без новых блоков — проверка
// дизайн-системы, как в ТЗ. Тема farm (палитра Amaya Plus из base). Первый экран — арт онбординга Farm (награды
// и звери, Figma 8:1369), преимущества — слайды Amaya Plus с их же текстами. Ролик — трейлер Farm (YouTube D92ck_F4PAw,
// 640×360, 30 с), постер — кадр с 6-й секунды (амбар): на первом кадре в ролик впечатана кнопка «▶» игры, а у DsVideo
// своя. Отзывы — настоящие из App Store (ники авторов как там), FAQ — по смыслу Cars 2 про Farm
import { imageSetFromFiles } from '@amaya/ui'
import { defineLanding } from '../../shared/landing'
import video from './art/gameplay.mp4?url'

const art = import.meta.glob<string>('./art/*.{png,webp}', { query: '?url', import: 'default', eager: true })
const image = (name: string) => imageSetFromFiles(art, `./art/${name}`)
const SLIDES = ['trusted', 'privacy', 'educational', 'offline']

export const farm = defineLanding({
  id: 'farm',
  site: 'web.lp_farm',
  theme: 'farm',
  stores: {
    // App Store — Pages Hub (useAppsInfo), Google Play — пакет Farm из данных InApp
    appStore: 'https://apps.apple.com/app/id1441292800',
    googlePlay: 'https://play.google.com/store/apps/details?id=com.amayasoft.my.first.animals.toddler.games.farm.animal.sounds'
  },
  heroArt: image('hero'),
  features: SLIDES.map((slide, index) => ({
    art: image(`feature-${index + 1}`),
    title: `common.plus.slide.${slide}.title`,
    text: `common.plus.slide.${slide}.text`
  })),
  video: { src: video, poster: image('poster') },
  reviews: 4,
  faq: 5
})
