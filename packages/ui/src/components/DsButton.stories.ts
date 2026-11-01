import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import { useStoryTexts } from '../stories/useStoryTexts'
import DsButton from './DsButton.vue'
import DsSpinner from './DsSpinner.vue'

const meta = {
  title: 'Действия/DsButton',
  component: DsButton,
  args: { variant: 'primary', block: false, loading: false, disabled: false, shine: false },
  argTypes: { variant: { control: 'inline-radio', options: ['primary', 'secondary'] } }
} satisfies Meta<typeof DsButton>

export default meta

// Счётчик срабатываний: два быстрых нажатия — одно срабатывание (защита от двойного тапа, 800 мс)
const useCounter = () => {
  const clicks = ref(0)
  return { clicks, count: () => clicks.value++ }
}

export const Playground: StoryObj<typeof meta> = {
  name: 'Настройка',
  render: args => ({
    components: { DsButton },
    setup: () => ({ args, ...useStoryTexts(), ...useCounter() }),
    template: `
      <div class="ds:space-y-3 ds:p-6">
        <DsButton v-bind="args" :loading-label="t('ds.spinner.aria.label')" data-testid="button" @click="count">{{ t('common.button.continue.default') }}</DsButton>
        <p class="sb-note">Срабатываний: <b data-testid="clicks">{{ clicks }}</b></p>
      </div>
    `
  })
}

export const States: StoryObj = {
  name: 'Все состояния',
  render: () => ({
    components: { DsButton },
    setup: () => useStoryTexts(),
    template: `
      <div class="ds:space-y-3 ds:p-6" style="max-width: 360px">
        <DsButton block data-testid="primary">{{ t('common.button.continue.default') }}</DsButton>
        <DsButton block shine>{{ t('common.button.continue.default') }}</DsButton>
        <DsButton block variant="secondary" data-testid="secondary">{{ t('common.button.restore') }}</DsButton>
        <DsButton block loading :loading-label="t('ds.spinner.aria.label')" data-testid="loading">{{ t('common.button.continue.default') }}</DsButton>
        <DsButton block disabled data-testid="disabled">{{ t('common.button.continue.default') }}</DsButton>
      </div>
    `
  })
}

export const LongText: StoryObj = {
  name: 'Длинный текст',
  render: () => ({
    components: { DsButton },
    setup: () => useStoryTexts(),
    template: `
      <div class="ds:space-y-3 ds:p-6" style="max-width: 320px">
        <DsButton block>{{ longest('app.farm.banner.title_4') }}</DsButton>
        <DsButton>{{ longest('common.button.restore') }}</DsButton>
      </div>
    `
  })
}

export const Spinner: StoryObj = {
  name: 'Спиннер',
  render: () => ({
    components: { DsSpinner },
    setup: () => useStoryTexts(),
    template: `
      <div class="ds:flex ds:items-center ds:space-x-4 ds:p-6 ds:text-text-primary">
        <DsSpinner size="sm" /><DsSpinner /><DsSpinner size="lg" tone="accent" :label="t('ds.spinner.aria.label')" />
      </div>
    `
  })
}
