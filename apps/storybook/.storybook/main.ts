import type { StorybookConfig } from '@storybook/vue3-vite'

const config: StorybookConfig = {
  // Истории компонентов лежат рядом с ними в пакетах, общие (токены, тексты) — здесь
  stories: [
    '../stories/**/*.stories.ts',
    '../../../packages/*/src/**/*.stories.ts'
  ],
  framework: '@storybook/vue3-vite',
  core: {
    disableTelemetry: true
  }
}

export default config
