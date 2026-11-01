import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { useStoryTexts } from '../stories/useStoryTexts'
import DsBox from './DsBox.vue'
import DsStack from './DsStack.vue'
import DsText from './DsText.vue'

const meta = {
  title: 'Основа/DsStack и DsBox',
  component: DsStack,
  args: { direction: 'vertical', gap: 3, align: 'stretch', justify: 'start' },
  argTypes: {
    direction: { control: 'inline-radio', options: ['vertical', 'horizontal'] },
    gap: { control: 'select', options: [0, 1, 2, 3, 4, 5, 6, 8, 10, 12] },
    align: { control: 'inline-radio', options: ['stretch', 'start', 'center', 'end'] },
    justify: { control: 'inline-radio', options: ['start', 'center', 'end', 'between'] }
  }
} satisfies Meta<typeof DsStack>

export default meta

export const Stack: StoryObj<typeof meta> = {
  name: 'Стек карточек',
  render: args => ({
    components: { DsStack, DsBox, DsText },
    setup: () => ({ args, ...useStoryTexts() }),
    template: `
      <div class="ds:bg-plan-border ds:p-6">
        <DsStack v-bind="args" data-testid="stack">
          <DsBox v-for="key in ['app.farm.banner.title_1', 'app.farm.banner.title_2', 'app.farm.banner.title_3']" :key="key" surface="card" :padding="4">
            <DsText variant="title-md">{{ t(key) }}</DsText>
          </DsBox>
        </DsStack>
      </div>
    `
  })
}
