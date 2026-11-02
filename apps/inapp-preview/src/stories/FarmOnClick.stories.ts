// Целый пейволл Farm · On click: одна история — пресеты (новый пользователь, триал был, нет продукта, другой сегмент, евро),
// итог покупки и лог в панели; язык, «экран открыт / закрыт» и «идёт покупка» — в тулбаре
import type { StoryObj } from '@storybook/vue3-vite'
import Screen from '../variants/ios/as/farm/ds1/pw-trio/index.vue'
import { presets } from '../variants/ios/as/farm/ds1/pw-trio/presets'
import { WHITE_BACKDROP } from '@amaya/ui/stories'
import { SCREENS_META, screenStory, type ScreenArgs } from './screenStory'

export default {
  title: 'Пейволлы/Farm · On click',
  id: 'пейволлы-farm-on-click',
  ...SCREENS_META
}

export const FarmOnClick: StoryObj<ScreenArgs> = { name: 'Farm · On click', ...screenStory(Screen, presets, WHITE_BACKDROP) }
