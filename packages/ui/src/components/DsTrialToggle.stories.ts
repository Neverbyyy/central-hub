import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import { useStoryTexts, NO_SCREEN_STATE } from '../stories'
import DsTrialToggle from './DsTrialToggle.vue'

const meta = {
  title: 'Farm/Тумблер триала',
  component: DsTrialToggle,
  args: { modelValue: false, label: '', disabled: false },
  globals: { theme: 'farm', ...NO_SCREEN_STATE },
  argTypes: {
    modelValue: { table: { disable: true } },
    label: { table: { disable: true } },
    disabled: { name: 'Идёт покупка', control: 'boolean' }
  }
} satisfies Meta<typeof DsTrialToggle>

export default meta

// Нажимается вся строка; бегунок едет через transform. Включённого состояния в макете нет — цвет взят у выбранного тарифа
export const Toggle: StoryObj<typeof meta> = {
  name: 'Тумблер триала',
  render: args => ({
    components: { DsTrialToggle },
    setup() {
      const on = ref(false)
      return { args, on, ...useStoryTexts() }
    },
    template: `
      <div class="ds:p-6" style="max-width: 320px">
        <DsTrialToggle v-model="on" :label="t('common.trial.free_trial')" :disabled="args.disabled" data-testid="toggle" />
        <p class="sb-note">Включён: <b data-testid="state">{{ on }}</b></p>
      </div>
    `
  })
}
