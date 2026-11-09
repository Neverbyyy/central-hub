// Данные приложения для проверки пейволла Baby Care: продукты InApp com.slamsoft.mybabycare (ios.tm1.varb.*),
// цены — из их ID ($12.99 в год, $2.99 в неделю). Без годового продукта экран не показывается
import type { PaywallData } from '@amaya/paywall-kit'
import type { ScreenPreset } from '../../../../../../types'

const PRODUCTS = [
  { id: 'com.slamsoft.mybabycare.yearly.notrial.1299', price: '$12.99' },
  { id: 'com.slamsoft.mybabycare.weekly.trial3.299', price: '$2.99' }
]

const base: PaywallData = { locale: 'en', variant: 'ios_pp_babycare_ds1_varb_pw_duo_v1', wasTrial: false, owned: [], products: PRODUCTS }

export const presets: Record<string, ScreenPreset> = {
  default: { name: 'Новый пользователь: триал доступен', data: base },
  wasTrial: { name: 'Триал уже был', data: { ...base, wasTrial: true } },
  euro: { name: 'Цены в евро', data: { ...base, products: PRODUCTS.map(p => ({ ...p, price: `${p.price.slice(1).replace('.', ',')} €` })) } },
  noProduct: { name: 'Нет продукта — экран не показывается', data: { ...base, products: PRODUCTS.slice(1) } }
}
