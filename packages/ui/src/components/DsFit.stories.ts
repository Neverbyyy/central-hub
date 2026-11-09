import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { APPS_COUNT, FEATURE_KEYS, useStoryTexts, NO_SCREEN_STATE } from '../stories'
import DsBenefitList from './DsBenefitList.vue'
import DsButton from './DsButton.vue'
import DsFit from './DsFit.vue'
import DsText from './DsText.vue'

const meta = {
  title: 'Общее/Подгонка по высоте',
  component: DsFit,
  args: { minScale: 0.6 },
  globals: NO_SCREEN_STATE
} satisfies Meta<typeof DsFit>

export default meta

// Место по высоте — в панели: пока содержимое помещается, масштаб 1; ниже — уменьшается целиком, вёрстка та же
export const Fit: StoryObj<typeof meta & { args: { height: number } }> = {
  name: 'Подгонка по высоте',
  args: { height: 220 } as never,
  argTypes: { height: { name: 'Высота места, px', control: { type: 'range', min: 120, max: 400, step: 10 } } } as never,
  render: args => ({
    components: { DsFit, DsText, DsBenefitList, DsButton },
    setup: () => ({ args: args as typeof args & { height: number }, FEATURE_KEYS, APPS_COUNT, ...useStoryTexts() }),
    template: `
      <div class="ds:p-6">
        <div :style="{ width: '320px', height: args.height + 'px', outline: '1px dashed rgb(0 0 0 / 0.3)' }">
          <DsFit class="ds:size-full" :min-scale="args.minScale">
            <div class="ds:flex ds:h-full ds:flex-col ds:items-center ds:justify-between ds:p-4">
              <DsText as="h2" variant="title-lg" align="center">{{ t('common.plus.title.unlimited') }}</DsText>
              <DsBenefitList :items="FEATURE_KEYS.map(key => t(key, { count: APPS_COUNT }))" />
              <DsButton block>{{ t('common.button.continue.default') }}</DsButton>
            </div>
          </DsFit>
        </div>
      </div>
    `
  })
}

// grow: места больше — блок увеличивается целиком (не больше maxScale, здесь 1,5), как вертикальный пейволл на iPad.
// Содержимое — своей высоты, без растяжения на всю: DsFit меряет именно её
export const Grow: StoryObj<typeof meta & { args: { height: number } }> = {
  name: 'Подгонка с увеличением (grow)',
  args: { height: 320 } as never,
  argTypes: { height: { name: 'Высота места, px', control: { type: 'range', min: 120, max: 480, step: 10 } } } as never,
  render: args => ({
    components: { DsFit, DsText, DsBenefitList, DsButton },
    setup: () => ({ args: args as typeof args & { height: number }, FEATURE_KEYS, APPS_COUNT, maxScale: () => 1.5, ...useStoryTexts() }),
    template: `
      <div class="ds:p-6">
        <div :style="{ width: '320px', height: args.height + 'px', outline: '1px dashed rgb(0 0 0 / 0.3)' }">
          <DsFit class="ds:size-full" :min-scale="args.minScale" grow :max-scale="maxScale">
            <div class="ds:flex ds:flex-col ds:items-center ds:p-4">
              <DsText as="h2" variant="title-lg" align="center">{{ t('common.plus.title.unlimited') }}</DsText>
              <DsBenefitList class="ds:mt-3" :items="FEATURE_KEYS.map(key => t(key, { count: APPS_COUNT }))" />
              <DsButton class="ds:mt-3">{{ t('common.button.continue.default') }}</DsButton>
            </div>
          </DsFit>
        </div>
      </div>
    `
  })
}
