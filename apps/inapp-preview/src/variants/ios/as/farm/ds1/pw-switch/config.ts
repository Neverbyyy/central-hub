// Пейволл Farm «On start» на дизайн-системе: редизайн InApp ios/as/farm/tm4/pw-switch (вариант B).
// Собран без новых компонентов: шаблон PwPlusSplit, тема base (Amaya Plus), свои только продукты
import type { PlusSwitchConfig } from '@amaya/paywall-kit'
import { PLUS_LOGO, PLUS_SLIDES } from '../common/plus'

export const config: PlusSwitchConfig = {
  mode: 'switch',
  theme: 'farm',
  appsCount: 25,
  trialDays: 3,
  logo: PLUS_LOGO,
  slides: PLUS_SLIDES,
  // Сегменты InApp (useConfig, ios.tm4.varb.*.start.*)
  segments: {
    ut1: {
      yearNoTrial: 'com.amayasoft.farm.yearly.notrial.4999',
      weekNoTrial: 'com.amayasoft.farm.weekly.notrial.999',
      weekTrial: 'com.amayasoft.farm.weekly.trial3.pwall.999'
    },
    wout1: {
      yearNoTrial: 'com.amayasoft.farm.yearly.notrial.2499',
      weekNoTrial: 'com.amayasoft.farm.weekly.notrial.499',
      weekTrial: 'com.amayasoft.farm.weekly.trial3.pwall.499'
    }
  },
  defaultSegment: 'ut1'
}
