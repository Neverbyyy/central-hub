// Пейволл Baby Care «Paywall B» целиком: вертикальный экран, по умолчанию — телефон 390×844 (как в макете).
// Пресеты данных, итог покупки и лог — в панели; язык, «экран открыт / закрыт» и размер — в тулбаре
import type { StoryObj } from '@storybook/vue3-vite'
import Screen from '../variants/ios/pp/babycare/ds1/pw-duo/index.vue'
import { presets } from '../variants/ios/pp/babycare/ds1/pw-duo/presets'
import { WHITE_BACKDROP } from '@amaya/ui/stories'
import { SCREENS_META, screenStory, type ScreenArgs } from './screenStory'

export default {
  title: 'Пейволлы/Baby Care',
  id: 'пейволлы-baby-care',
  ...SCREENS_META,
  parameters: { ...SCREENS_META.parameters, viewport: { initial: 'phonePortraitM' } }
}

export const BabyCare: StoryObj<ScreenArgs> = { name: 'Baby Care', ...screenStory(Screen, presets, WHITE_BACKDROP) }
