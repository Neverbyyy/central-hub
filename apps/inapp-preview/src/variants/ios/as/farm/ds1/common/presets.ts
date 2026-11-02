// Данные приложения для проверки пейволлов Farm: «On start» и «On click» берут одни и те же
import type { PaywallData } from '@amaya/paywall-kit'
import type { ScreenPreset } from '../../../../../../types'
import { FARM_PRODUCTS } from './plus'

export function farmPresets(variant: (segment: string) => string, missing: string): Record<string, ScreenPreset> {
  const base: PaywallData = { locale: 'en', variant: variant('ut1'), wasTrial: false, owned: [], products: FARM_PRODUCTS }
  return {
    default: { name: 'Новый пользователь: триал доступен', data: base },
    wasTrial: { name: 'Триал уже был', data: { ...base, wasTrial: true } },
    wout1: { name: 'Сегмент wout1: другие цены', data: { ...base, variant: variant('wout1') } },
    euro: { name: 'Цены в евро', data: { ...base, products: FARM_PRODUCTS.map(p => ({ ...p, price: `${p.price.slice(1).replace('.', ',')} €` })) } },
    noProduct: { name: 'Нет продукта — экран не показывается', data: { ...base, products: FARM_PRODUCTS.filter(p => p.id !== missing) } }
  }
}
