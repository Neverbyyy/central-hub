// Лендинг Farm — только здесь, в Storybook: макета нет, страница собрана из блоков Cars 2 без новых блоков
// (конфиг — stories/landings/farm/config.ts). Пока тексты web.lp_farm.* не заведены и не утверждены, на их месте ключи
import { LkPage } from '@amaya/landing-kit'
import type { StoryObj } from '@storybook/vue3-vite'
import { farm } from './landings/farm/config'

export default {
  title: 'Лендинги/Farm',
  parameters: { layout: 'fullscreen', themes: false },
  globals: { viewport: { value: 'phonePortraitS', isRotated: false } }
}

export const Farm: StoryObj = {
  name: 'Farm',
  render: () => ({
    components: { LkPage },
    setup: () => ({ config: farm }),
    template: '<LkPage :config="config" />'
  })
}
