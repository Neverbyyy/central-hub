import type { StoryObj } from '@storybook/vue3-vite'
import { useStoryTexts } from '../stories'
import DsRating from './DsRating.vue'

// Звёзды отзыва: 5 из 5 как в макете и неполные — бледнее. Рядом — что прочитает скринридер
export default {
  title: 'Блоки лендинга/Звёзды',
  component: DsRating
}

export const Stars: StoryObj = {
  name: 'Звёзды',
  render: () => ({
    components: { DsRating },
    setup: () => ({ ...useStoryTexts(), values: [5, 4, 3, 0] }),
    template: `
      <div class="ds:space-y-3 ds:p-6">
        <div v-for="value in values" :key="value" class="ds:flex ds:items-center ds:space-x-3">
          <DsRating :value="value" :label="t('ds.rating.aria.label', { rating: value })" :data-testid="'rating-' + value" />
          <span class="sb-note ds:p-0">{{ t('ds.rating.aria.label', { rating: value }) }}</span>
        </div>
      </div>
    `
  })
}
