// Общее у пейволлов Farm (стиль Amaya Plus): слайды слева и логотип. Картинки слайдов — статичные версии
// анимаций InApp (их показывают старым устройствам), нарезаны по конвенции 12 файлов
import type { PlusSlide } from '@amaya/paywall-kit'
import { imageSetFromFiles } from '@amaya/ui'
import logo from './art/plus-logo.svg?url'

const files = import.meta.glob<string>('./art/*.{png,webp}', { eager: true, query: '?url', import: 'default' })
const art = (name: string) => imageSetFromFiles(files, `./art/${name}`)

export const PLUS_LOGO = logo

// Порядок и фоны — как в InApp farm tm4 (page-swiper)
export const PLUS_SLIDES: PlusSlide[] = [
  { title: 'common.plus.slide.apps.title', text: 'common.plus.slide.apps.text', art: art('slide-1'), bg: 'sky' },
  { title: 'common.plus.slide.trusted.title', text: 'common.plus.slide.trusted.text', art: art('slide-2'), bg: 'lime' },
  { title: 'common.plus.slide.privacy.title', text: 'common.plus.slide.privacy.text', art: art('slide-3'), bg: 'yellow' },
  { title: 'common.plus.slide.educational.title', text: 'common.plus.slide.educational.text', art: art('slide-4'), bg: 'periwinkle' },
  { title: 'common.plus.slide.offline.title', text: 'common.plus.slide.offline.text', art: art('slide-5'), bg: 'lilac' }
]

// Цены из пресета InApp ios_as_farm_tm4_varb_ut1_*
export const FARM_PRODUCTS = [
  { id: 'com.amayasoft.farm.yearly.notrial.4999', price: '$49.99' },
  { id: 'com.amayasoft.farm.weekly.notrial.999', price: '$9.99' },
  { id: 'com.amayasoft.farm.weekly.trial3.pwall.999', price: '$9.99' },
  { id: 'com.amayasoft.farm.yearly.trial3.9999', price: '$99.99' },
  { id: 'com.amayasoft.farm.monthly.trial3.1999', price: '$19.99' },
  { id: 'com.amayasoft.farm.weekly.trial3.999', price: '$9.99' },
  { id: 'com.amayasoft.farm.yearly.notrial.2499', price: '$24.99' },
  { id: 'com.amayasoft.farm.weekly.notrial.499', price: '$4.99' },
  { id: 'com.amayasoft.farm.weekly.trial3.pwall.499', price: '$4.99' },
  { id: 'com.amayasoft.farm.yearly.trial3.4999', price: '$49.99' },
  { id: 'com.amayasoft.farm.monthly.trial3.999', price: '$9.99' },
  { id: 'com.amayasoft.farm.weekly.trial3.499', price: '$4.99' }
]
