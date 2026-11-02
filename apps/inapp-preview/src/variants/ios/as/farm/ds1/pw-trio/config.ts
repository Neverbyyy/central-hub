// Пейволл Farm «On click» на дизайн-системе: редизайн InApp ios/as/farm/tm4/pw-trio (вариант B).
// Тот же шаблон PwPlusSplit, что и «On start», — другой режим и продукты
import type { PlusTrioConfig } from '@amaya/paywall-kit'
import { PLUS_LOGO, PLUS_SLIDES } from '../common/plus'

export const config: PlusTrioConfig = {
  mode: 'trio',
  theme: 'farm',
  appsCount: 25,
  trialDays: 3,
  logo: PLUS_LOGO,
  slides: PLUS_SLIDES,
  // Сегменты InApp (useConfig, ios.tm4.varb.*.tap.*)
  segments: {
    ut1: {
      week: 'com.amayasoft.farm.weekly.trial3.999',
      month: 'com.amayasoft.farm.monthly.trial3.1999',
      year: 'com.amayasoft.farm.yearly.trial3.9999'
    },
    wout1: {
      week: 'com.amayasoft.farm.weekly.trial3.499',
      month: 'com.amayasoft.farm.monthly.trial3.999',
      year: 'com.amayasoft.farm.yearly.trial3.4999'
    }
  },
  defaultSegment: 'ut1'
}
