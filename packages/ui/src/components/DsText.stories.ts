import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { useStoryTexts } from '../stories/useStoryTexts'
import DsText from './DsText.vue'

const meta = {
  title: 'Основа/DsText',
  component: DsText
} satisfies Meta<typeof DsText>

export default meta

const VARIANTS = ['title-lg', 'title-md', 'button', 'body', 'caption', 'badge']
const TONES = ['primary', 'secondary', 'accent', 'link']

export const Variants: StoryObj = {
  name: 'Стили — размер меняется на 844 и 1024',
  render: () => ({
    components: { DsText },
    setup: () => ({ ...useStoryTexts(), VARIANTS }),
    template: `
      <div class="ds:space-y-4 ds:p-6">
        <div v-for="variant in VARIANTS" :key="variant">
          <code style="opacity: .5; font-size: 11px">{{ variant }}</code>
          <DsText :variant="variant" :data-variant="variant">{{ t('app.farm.banner.title_1') }}</DsText>
        </div>
      </div>
    `
  })
}

export const Tones: StoryObj = {
  name: 'Цвета',
  render: () => ({
    components: { DsText },
    setup: () => ({ ...useStoryTexts(), TONES }),
    template: `
      <div class="ds:space-y-3 ds:p-6">
        <DsText v-for="tone in TONES" :key="tone" :tone="tone" variant="title-md">{{ tone }} — {{ t('app.farm.banner.title_2') }}</DsText>
        <div class="ds:bg-cta-bg ds:p-3"><DsText tone="inverse" variant="title-md">inverse — {{ t('app.farm.banner.title_2') }}</DsText></div>
      </div>
    `
  })
}

export const LongText: StoryObj = {
  name: 'Длинный текст',
  render: () => ({
    components: { DsText },
    setup: () => useStoryTexts(),
    template: `
      <div class="ds:space-y-3 ds:p-6" style="max-width: 320px">
        <DsText variant="title-lg">{{ longest('app.farm.banner.title_4') }}</DsText>
        <DsText variant="body">{{ longest('common.legal.cancel_anytime') }}</DsText>
      </div>
    `
  })
}
