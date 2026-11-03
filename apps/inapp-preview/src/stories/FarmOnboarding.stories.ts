// Онбординг Farm «Onboarding B» целиком: два шага, «Continue» листает, на втором шаге — крестик с задержкой.
// Пресет один (продуктов нет), лог вызовов — в панели; язык и «экран открыт / закрыт» — в тулбаре
import type { StoryObj } from '@storybook/vue3-vite'
import Screen from '../variants/ios/as/farm/ds1/onboarding/index.vue'
import { presets } from '../variants/ios/as/farm/ds1/onboarding/presets'
import { WHITE_BACKDROP } from '@amaya/ui/stories'
import { SCREENS_META, screenStory, type ScreenArgs } from './screenStory'

export default {
  title: 'Онбординги/Farm',
  id: 'онбординги-farm',
  ...SCREENS_META
}

export const FarmOnboarding: StoryObj<ScreenArgs> = { name: 'Farm', ...screenStory(Screen, presets, WHITE_BACKDROP) }
