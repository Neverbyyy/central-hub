import type { Meta, StoryObj } from '@storybook/vue3-vite'
import DsRoot from './DsRoot.vue'

// Каждая история Storybook уже лежит в DsRoot (декоратор переключателя темы). Здесь — что даёт корень:
// смена темы перекрашивает экран без правки разметки. Подписи — имена токенов, не тексты продукта
const meta = {
  title: 'Основа/DsRoot — корень и тема',
  component: DsRoot
} satisfies Meta<typeof DsRoot>

export default meta

export const ThemeSwitch: StoryObj<typeof meta> = {
  name: 'Смена темы',
  render: () => ({
    template: `
      <div class="ds:space-y-4 ds:p-4" data-testid="theme-demo">
        <div class="ds:rounded-card ds:border-2 ds:border-plan-border ds:bg-plan-bg ds:p-4 ds:text-body">
          <code>color.plan.border</code>
        </div>
        <div data-testid="plan-selected" class="ds:rounded-card ds:border-2 ds:border-plan-border-selected ds:bg-plan-bg-selected ds:p-4 ds:text-body">
          <code>color.plan.border-selected · color.plan.bg-selected</code>
        </div>
        <div data-testid="cta" class="ds:rounded-button ds:bg-cta-bg ds:px-6 ds:py-3 ds:text-center ds:font-title ds:text-button ds:text-cta-text">
          <code>color.cta.bg</code>
        </div>
        <div class="ds:inline-block ds:rounded-badge ds:bg-badge-bg ds:px-2 ds:py-1 ds:text-badge ds:text-badge-text">
          <code>color.badge.bg</code>
        </div>
        <p data-testid="title" class="ds:font-title ds:text-title-lg ds:text-accent">
          <code>text.title-lg · color.accent</code>
        </p>
      </div>
    `
  })
}
