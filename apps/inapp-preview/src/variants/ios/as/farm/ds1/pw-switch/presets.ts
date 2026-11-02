// Данные приложения для проверки «On start»: без годового продукта экран не показывается
import { farmPresets } from '../common/presets'

export const presets = farmPresets(segment => `ios_as_farm_ds1_varb_${segment}_pw_switch_v1`, 'com.amayasoft.farm.yearly.notrial.4999')
