import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import { useStoryTexts } from '../stories'
import DsButton from './DsButton.vue'

// Главная кнопка обоих пейволлов: в Farm — плоская оранжевая капсом, в Cars 2 — градиент с рамкой и обводкой букв
const meta = {
  title: 'Общее/Кнопка',
  component: DsButton,
  args: { variant: 'primary', size: 'md', block: false, loading: false, disabled: false, shine: false },
  argTypes: {
    variant: { control: 'inline-radio', options: ['primary', 'secondary', 'lp'] },
    size: { control: 'inline-radio', options: ['md', 'sm', 'lg'] }
  }
} satisfies Meta<typeof DsButton>

export default meta

// Счётчик срабатываний: два быстрых нажатия — одно срабатывание (защита от двойного тапа, 800 мс)
export const Playground: StoryObj<typeof meta> = {
  name: 'Настройка',
  render: args => ({
    components: { DsButton },
    setup() {
      const clicks = ref(0)
      return { args, clicks, ...useStoryTexts() }
    },
    template: `
      <div class="ds:space-y-3 ds:p-6">
        <DsButton v-bind="args" :loading-label="t('ds.spinner.aria.label')" data-testid="button" @click="clicks++">{{ t('common.button.continue.default') }}</DsButton>
        <p class="sb-note">Срабатываний: <b data-testid="clicks">{{ clicks }}</b></p>
      </div>
    `
  })
}

// Все варианты, которые есть в пейволлах: главная, с бликом (Cars 2), вторая «Unlock for» (Cars 2), загрузка, выключена
export const States: StoryObj = {
  name: 'Все состояния',
  render: () => ({
    components: { DsButton },
    setup: () => useStoryTexts(),
    template: `
      <div class="ds:space-y-3 ds:p-6" style="max-width: 360px">
        <DsButton block data-testid="primary">{{ t('common.button.continue.default') }}</DsButton>
        <DsButton block shine>{{ t('common.button.try_free_days', { days: 3 }, 3) }}</DsButton>
        <DsButton variant="secondary" size="sm" data-testid="secondary-sm">{{ t('common.button.unlock_for', { price: '$5.99' }) }}</DsButton>
        <DsButton block loading :loading-label="t('ds.spinner.aria.label')" data-testid="loading">{{ t('common.button.continue.default') }}</DsButton>
        <DsButton block disabled data-testid="disabled">{{ t('common.button.continue.default') }}</DsButton>
      </div>
    `
  })
}

// Кнопка лендинга: на первом экране (md, 60) и ниже по странице (lg, 64); в Cars 2 — зелёный градиент, буквы градиентом
export const Landing: StoryObj = {
  name: 'Лендинг',
  render: () => ({
    components: { DsButton },
    setup: () => useStoryTexts(),
    template: `
      <div class="ds:space-y-6 ds:p-6">
        <DsButton variant="lp" data-testid="lp">{{ t('common.button.play_free') }}</DsButton>
        <div><DsButton variant="lp" size="lg" data-testid="lp-lg">{{ t('common.button.play_free') }}</DsButton></div>
        <div><DsButton variant="lp" size="lg" loading :loading-label="t('ds.spinner.aria.label')">{{ t('common.button.play_free') }}</DsButton></div>
      </div>
    `
  })
}
