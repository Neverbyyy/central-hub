// Данные приложения для проверки онбординга. Продуктов и цен он не показывает, поэтому пресет один:
// язык, «экран открыт / закрыт» — в тулбаре Storybook
import type { ScreenPreset } from '../../../../../../types'

export const presets: Record<string, ScreenPreset> = {
  default: {
    name: 'Новый пользователь',
    data: { locale: 'en', variant: 'ios_as_farm_ds1_varb_ut1_onboarding_v1', wasTrial: false, owned: [], products: [] }
  }
}
