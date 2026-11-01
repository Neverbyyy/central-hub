import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { useStoryEnv } from '../.storybook/env'

// Что видят истории из переключателей тулбара «Экран» и «Покупка». Со дня 2 по ним живут пейволлы
const meta = {
  title: 'Основа/Окружение',
  parameters: { themes: false }
} satisfies Meta

export default meta

export const State: StoryObj = {
  name: 'Состояние из тулбара',
  render: () => ({
    setup: () => ({ env: useStoryEnv() }),
    template: `
      <table class="sb-table" data-testid="env">
        <tbody>
          <tr><td><code>screen</code></td><td data-testid="env-screen"><code>{{ env.screen }}</code></td></tr>
          <tr><td><code>purchasing</code></td><td data-testid="env-purchasing"><code>{{ env.purchasing }}</code></td></tr>
        </tbody>
      </table>
    `
  })
}
