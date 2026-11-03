// Лендинг Farm целиком — та же страница, что в apps/landings (/farm), с тем же конфигом и артом.
// Язык — из тулбара, размер — телефон 375, iPad 768, десктоп. Кнопки здесь в стор не уводят: на компьютере
// кнопка прокручивает к значкам сторов, а нажатия видны в консоли (track)
import { LkPage } from '@amaya/landing-kit'
import type { StoryObj } from '@storybook/vue3-vite'
import { farm } from '../../landings/app/landings/farm/config'

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
