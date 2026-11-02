import type { StorybookConfig } from '@storybook/vue3-vite'

const config: StorybookConfig = {
  // Истории компонентов лежат рядом с ними в пакетах, общие (токены, тексты) — здесь
  stories: [
    '../stories/**/*.stories.ts',
    '../../../packages/*/src/**/*.stories.ts',
    // Целые экраны: пейволлы Cars 2 и Farm, устроенные как варианты InApp
    '../../inapp-preview/src/**/*.stories.ts'
  ],
  framework: '@storybook/vue3-vite',
  // Картинки для историй: арт Cars 2 из InApp и значки сторов из Pages Hub — в компоненты они не попадают
  staticDirs: ['../public'],
  core: {
    disableTelemetry: true
  }
}

export default config
