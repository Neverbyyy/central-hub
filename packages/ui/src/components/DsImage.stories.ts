import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { imageSet } from '../image'
import { DEMO_ART, DEMO_BADGES, useStoryTexts } from '../stories/useStoryTexts'
import DsBackground from './DsBackground.vue'
import DsButton from './DsButton.vue'
import DsGameTitle from './DsGameTitle.vue'
import DsImage from './DsImage.vue'

const meta = {
  title: 'Основа/DsImage и DsBackground',
  component: DsImage
} satisfies Meta<typeof DsImage>

export default meta

const set = imageSet(DEMO_ART)

export const Convention: StoryObj = {
  name: 'Картинка по конвенции — размер под экран',
  render: () => ({
    components: { DsImage },
    setup: () => ({ set }),
    template: `
      <div class="ds:p-6" style="max-width: 480px">
        <DsImage :set="set" alt="" ratio="3 / 2" data-testid="image" />
        <p class="sb-note">small до 844 px, medium от 844, large от 1024; webp, где понимает браузер; @2x на плотных экранах.</p>
      </div>
    `
  })
}

export const SingleFile: StoryObj = {
  name: 'Один файл (SVG)',
  render: () => ({
    components: { DsImage },
    setup: () => ({ src: DEMO_BADGES.appStore }),
    template: '<div class="ds:p-6"><DsImage :src="src" alt="" size="intrinsic" class="ds:h-store-badge" /></div>'
  })
}

export const Background: StoryObj = {
  name: 'Фон экрана',
  render: () => ({
    components: { DsBackground, DsGameTitle, DsButton },
    setup: () => ({ set, ...useStoryTexts() }),
    template: `
      <DsBackground :set="set" class="ds:h-vh" data-testid="background">
        <div class="ds:flex ds:h-vh ds:flex-col ds:items-center ds:justify-end ds:space-y-4 ds:p-6 ds:pb-safe">
          <DsGameTitle>{{ t('app.farm.banner.title_1') }}</DsGameTitle>
          <DsButton shine>{{ t('common.button.continue.default') }}</DsButton>
        </div>
      </DsBackground>
    `
  })
}
