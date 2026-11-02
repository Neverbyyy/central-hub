// Данные приложения для проверки экрана: цены — из пресета InApp ios_as_cars2_tm11_varb_t1_pw_slider_v1
import type { PaywallData } from '@amaya/paywall-kit'
import type { ScreenPreset } from '../../../../../../types'

const VARIANT = 'ios_as_cars2_ds1_varb_t1_pw_slider_v1'
const PACKS = ['city', 'christmas', 'halloween', 'construction', 'modern', 'zoo', 'monstertrucks']

const products: PaywallData['products'] = [
  { id: 'com.amayasoft.cars2.yearly.trial3.3999', price: '$39.99' },
  { id: 'com.amayasoft.cars2.yearly.notrial.3499', price: '$34.99' },
  { id: 'com.amayasoft.cars2.weekly.trial3', price: '$9.99' },
  { id: 'com.amayasoft.cars2.yearly.trial3.2999', price: '$29.99' },
  { id: 'com.amayasoft.cars2.yearly.notrial.2499', price: '$24.99' },
  { id: 'com.amayasoft.cars2.weekly.trial3.799', price: '$7.99' },
  ...PACKS.map(name => ({ id: `com.amayasoft.cars2.${name}.599`, price: '$5.99' }))
]

const base: PaywallData = { locale: 'en', variant: VARIANT, wasTrial: false, owned: [], products }

export const presets: Record<string, ScreenPreset> = {
  default: { name: 'Новый пользователь: триал доступен', data: base },
  wasTrial: { name: 'Триал уже был', data: { ...base, wasTrial: true } },
  packsOwned: { name: 'Два набора уже куплены', data: { ...base, owned: ['com.amayasoft.cars2.city.599', 'com.amayasoft.cars2.zoo'] } },
  subscribed: { name: 'Подписка есть — только главная карточка', data: { ...base, owned: ['com.amayasoft.cars2.weekly.trial3'] } },
  wout1: { name: 'Сегмент wout1: другие цены', data: { ...base, variant: 'ios_as_cars2_ds1_varb_wout1_pw_slider_v1' } },
  euro: { name: 'Цены в евро', data: { ...base, products: products.map(p => ({ ...p, price: p.price ? `${p.price.slice(1).replace('.', ',')} €` : null })) } },
  noProduct: { name: 'Нет продукта — экран не показывается', data: { ...base, products: products.filter(p => p.id !== 'com.amayasoft.cars2.yearly.trial3.3999') } }
}
