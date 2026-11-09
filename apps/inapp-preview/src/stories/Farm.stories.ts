// Пейволлы Farm целиком — оба экрана одной игры в одном списке «Пейволлы › Farm», как у Cars 2:
// On start (тумблер триала) и On click (три тарифа). Пресеты (новый пользователь, триал был, нет продукта, другой сегмент,
// евро), итог покупки и лог — в панели; язык, «экран открыт / закрыт» и «идёт покупка» — в тулбаре.
// Адрес истории — от id меты и имени экспорта: подписи можно менять, адреса останутся
import type { StoryObj } from '@storybook/vue3-vite'
import OnStartScreen from '../variants/ios/as/farm/ds1/pw-switch/index.vue'
import { presets as onStartPresets } from '../variants/ios/as/farm/ds1/pw-switch/presets'
import OnClickScreen from '../variants/ios/as/farm/ds1/pw-trio/index.vue'
import { presets as onClickPresets } from '../variants/ios/as/farm/ds1/pw-trio/presets'
import { WHITE_BACKDROP } from '@amaya/ui/stories'
import { SCREENS_META, screenStory, type ScreenArgs } from './screenStory'

export default {
  title: 'Пейволлы/Farm',
  id: 'пейволлы-farm',
  ...SCREENS_META
}

export const OnStart: StoryObj<ScreenArgs> = { name: 'On start', ...screenStory(OnStartScreen, onStartPresets, WHITE_BACKDROP) }

export const OnClick: StoryObj<ScreenArgs> = { name: 'On click', ...screenStory(OnClickScreen, onClickPresets, WHITE_BACKDROP) }
