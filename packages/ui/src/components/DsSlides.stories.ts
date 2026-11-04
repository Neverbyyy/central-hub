import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import { APPS_COUNT, PLUS_SLIDES, useStoryEnv, useStoryTexts, NO_PURCHASE } from '../stories'
import DsSlides from './DsSlides.vue'
import DsText from './DsText.vue'

const meta = {
  title: 'Farm/Слайды Amaya Plus',
  component: DsSlides,
  args: { count: PLUS_SLIDES.length, interval: 3000 },
  argTypes: { count: { control: { type: 'range', min: 1, max: PLUS_SLIDES.length } }, interval: { control: { type: 'number', step: 500 } } },
  globals: { theme: 'farm', ...NO_PURCHASE }
} satisfies Meta<typeof DsSlides>

export default meta

// Левая половина пейволла Farm: листается пальцем и сама, пока «экран открыт» (тулбар). Номер слайда — событие change
export const Slides: StoryObj<typeof meta> = {
  name: 'Слайды Amaya Plus',
  render: args => ({
    components: { DsSlides, DsText },
    setup() {
      const shown = ref(0)
      return { args, env: useStoryEnv(), shown, PLUS_SLIDES, APPS_COUNT, ...useStoryTexts() }
    },
    template: `
      <div class="ds:p-6">
        <div style="width: 360px; height: 260px; border-radius: 24px; overflow: hidden">
          <DsSlides class="ds:h-full" :count="args.count" :interval="args.interval" :playing="env.screen === 'open'" dots-overlay
            :dot-label="i => t('ds.slides.dot.label', { number: i + 1 })" @change="shown = $event">
            <template #slide="{ index }">
              <div class="ds:flex ds:h-full ds:flex-col ds:items-center ds:justify-center ds:px-6 ds:pb-8" :class="PLUS_SLIDES[index].bg">
                <DsText as="h2" variant="title-md" align="center">{{ t('common.plus.slide.' + PLUS_SLIDES[index].name + '.title', { count: APPS_COUNT }) }}</DsText>
                <DsText align="center">{{ t('common.plus.slide.' + PLUS_SLIDES[index].name + '.text') }}</DsText>
              </div>
            </template>
          </DsSlides>
        </div>
        <p class="sb-note">Показан слайд: <b data-testid="shown">{{ shown + 1 }}</b></p>
      </div>
    `
  })
}
