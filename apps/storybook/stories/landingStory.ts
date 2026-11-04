// Лендинг целиком — та же страница, что в apps/landings, с тем же конфигом. Язык — из тулбара, размер — телефон 375
// (как макет), iPad 768, десктоп. Кнопки здесь в режиме компьютера: кнопка прокручивает к значкам сторов, а нажатия
// видны в консоли (track). Название истории Storybook берёт из имени экспорта
import { LkPage, type LandingConfig } from '@amaya/landing-kit'
import { NO_SCREEN_STATE, NO_THEME } from '@amaya/ui/stories'
import type { StoryObj } from '@storybook/vue3-vite'

export const landingMeta = {
  parameters: { layout: 'fullscreen', themes: false },
  globals: { viewport: { value: 'phonePortraitS', isRotated: false }, ...NO_THEME, ...NO_SCREEN_STATE }
}

export const landingStory = (config: LandingConfig): StoryObj => ({
  render: () => ({
    components: { LkPage },
    setup: () => ({ config }),
    template: '<LkPage :config="config" />'
  })
})
