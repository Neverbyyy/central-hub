// Целый пейволл Farm · On start: одна история — пресеты (новый пользователь, триал был, нет продукта, другой сегмент, евро),
// итог покупки и лог в панели; язык, «экран открыт / закрыт» и «идёт покупка» — в тулбаре
import type { StoryObj } from '@storybook/vue3-vite'
import Screen from '../variants/ios/as/farm/ds1/pw-switch/index.vue'
import { presets } from '../variants/ios/as/farm/ds1/pw-switch/presets'
import { WHITE_BACKDROP } from '@amaya/ui/stories'
import { SCREENS_META, screenStory, type ScreenArgs } from './screenStory'

export default {
  title: 'Пейволлы/Farm · On start',
  id: 'пейволлы-farm-on-start',
  ...SCREENS_META
}

export const FarmOnStart: StoryObj<ScreenArgs> = { name: 'Farm · On start', ...screenStory(Screen, presets, WHITE_BACKDROP) }
