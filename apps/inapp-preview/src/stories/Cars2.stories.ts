// Целый пейволл Cars 2: одна история — пресеты (новый пользователь, триал был, нет продукта, другой сегмент, евро),
// итог покупки и лог в панели; язык, «экран открыт / закрыт» и «идёт покупка» — в тулбаре
import type { StoryObj } from '@storybook/vue3-vite'
import Screen from '../variants/ios/as/cars2/ds1/pw-slider/index.vue'
import { presets } from '../variants/ios/as/cars2/ds1/pw-slider/presets'
import { GAME_BACKDROP } from '@amaya/ui/stories'
import { SCREENS_META, screenStory, type ScreenArgs } from './screenStory'

export default {
  title: 'Пейволлы/Cars 2',
  ...SCREENS_META
}

export const Cars2: StoryObj<ScreenArgs> = { name: 'Cars 2', ...screenStory(Screen, presets, GAME_BACKDROP) }
