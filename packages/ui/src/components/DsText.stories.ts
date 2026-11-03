import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { GAME_BACKDROP, useStoryTexts } from '../stories'
import { DS_TEXT_TONES, DS_TEXT_VARIANTS } from '../types'
import DsText from './DsText.vue'

const meta = {
  title: 'Общее/Текст',
  component: DsText
} satisfies Meta<typeof DsText>

export default meta

const TONES = DS_TEXT_TONES.filter(tone => tone !== 'inherit')

// Стили текста меняют размер на 844 px и на iPad (от 844 × 600) и свои у каждой темы; цвета — из темы. Каждый цвет — на холсте
// и на тёмном фоне: ссылки Cars 2 и inverse белые, они лежат поверх игры
export const Styles: StoryObj = {
  name: 'Текст',
  render: () => ({
    components: { DsText },
    setup: () => ({ ...useStoryTexts(), VARIANTS: DS_TEXT_VARIANTS, TONES, game: GAME_BACKDROP }),
    template: `
      <div class="ds:p-6">
        <div v-for="variant in VARIANTS" :key="variant" class="ds:mb-3">
          <code style="opacity: .5; font-size: 11px">{{ variant }}</code>
          <DsText :variant="variant" :data-variant="variant">{{ t('common.plus.title.unlimited') }}</DsText>
        </div>
        <div class="ds:mt-6 ds:grid ds:grid-cols-2">
          <template v-for="tone in TONES" :key="tone">
            <DsText :tone="tone" variant="body" class="ds:py-1 ds:pe-3">{{ tone }} — {{ t('common.button.restore') }}</DsText>
            <DsText :tone="tone" variant="body" class="ds:px-3 ds:py-1" :style="{ background: game }">{{ tone }} — {{ t('common.button.restore') }}</DsText>
          </template>
        </div>
      </div>
    `
  })
}
