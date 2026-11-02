// Данные приложения для проверки «On click»: без месячного продукта экран не показывается
import { farmPresets } from '../common/presets'

export const presets = farmPresets(segment => `ios_as_farm_ds1_varb_${segment}_pw_trio_v1`, 'com.amayasoft.farm.monthly.trial3.1999')
