import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { useStoryTexts } from '../stories/useStoryTexts'
import DsGameTitle from './DsGameTitle.vue'

const meta = {
  title: 'Основа/DsGameTitle',
  component: DsGameTitle
} satisfies Meta<typeof DsGameTitle>

export default meta

// Подложка цвета акцента — так видна белая обводка; цвета обводки и заливки — токены color.title.*
const backdrop = 'ds:bg-accent ds:p-6'

export const Default: StoryObj = {
  name: 'Заголовок с обводкой',
  render: () => ({
    components: { DsGameTitle },
    setup: () => ({ ...useStoryTexts(), backdrop }),
    template: `
      <div :class="backdrop" class="ds:space-y-4">
        <DsGameTitle data-testid="game-title">{{ t('app.farm.banner.title_1') }}</DsGameTitle>
        <DsGameTitle variant="title-md" as="h2">{{ t('app.farm.banner.title_3') }}</DsGameTitle>
      </div>
    `
  })
}

export const LongText: StoryObj = {
  name: 'Длинный текст — переносы у обводки и заливки совпадают',
  render: () => ({
    components: { DsGameTitle },
    setup: () => ({ ...useStoryTexts(), backdrop }),
    template: `
      <div :class="backdrop" style="max-width: 340px">
        <DsGameTitle>{{ longest('app.farm.banner.title_4') }}</DsGameTitle>
      </div>
    `
  })
}
