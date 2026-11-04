// Лендинг Cars 2 «Поехали» (/cars2-go): свой дизайн, макета нет. Страница как поездка — живая сцена Rive, автомойка
// пальцем, миры, финиш. Тема cars2-go, раскладка — LkRoadLayout (её включает поле road).
// Своё — ключи web.lp_cars2.go.*; отзывы, FAQ, футер, преимущества и ролик — те же, что у /cars2: смысл одинаковый.
// Постеры — кадры анимации, поэтому Rive появляется поверх картинки незаметно; машина собрана из слоёв той же анимации
import { cars2Animation, cars2WorldArt } from '@amaya/art/cars2'
import { imageSetFromFiles } from '@amaya/ui'
import { defineLanding } from '../../shared/landing'
import cars2 from '../cars2/config'

const art = import.meta.glob<string>('./art/*.webp', { query: '?url', import: 'default', eager: true })
const image = (name: string) => imageSetFromFiles(art, `./art/${name}`)

// Первыми — самые яркие карточки
const WORLDS = ['zoo', 'monstertrucks', 'city', 'halloween', 'christmas', 'construction', 'modern'] as const

export default defineLanding({
  id: 'cars2-go',
  site: 'web.lp_cars2.go',
  shared: 'web.lp_cars2',
  cta: false,
  theme: 'cars2-go',
  stores: cars2.stores,
  heroArt: image('hero'),
  features: cars2.features,
  video: cars2.video!,
  reviews: 4,
  faq: 5,
  road: {
    scene: { src: cars2Animation, artboard: 'paywall-without-icons', idle: ['idle-raccoon', 'idle-cars', 'idle-cars2'] },
    truck: image('truck'),
    truckRatio: '560 / 520',
    worlds: WORLDS.map(cars2WorldArt),
    balloons: { src: cars2Animation, artboard: 'balloons', poster: image('balloons'), ratio: '361 / 610' }
  }
})
