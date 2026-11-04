// Лендинг Cars 2 целиком — та же страница, что в apps/landings (/cars2), с тем же конфигом и артом.
// Язык — из тулбара, размер — телефон 375 (как макет), iPad 768, десктоп. Кнопки здесь в стор не уводят: на компьютере
// кнопка прокручивает к значкам сторов, а нажатия видны в консоли (track)
import { LkPage } from '@amaya/landing-kit'
import { NO_SCREEN_STATE, NO_THEME } from '@amaya/ui/stories'
import type { StoryObj } from '@storybook/vue3-vite'
import { cars2 } from '../../landings/app/landings/cars2/config'

export default {
  title: 'Лендинги/Cars 2',
  parameters: { layout: 'fullscreen', themes: false },
  globals: { viewport: { value: 'phonePortraitS', isRotated: false }, ...NO_THEME, ...NO_SCREEN_STATE }
}

export const Cars2: StoryObj = {
  name: 'Cars 2',
  render: () => ({
    components: { LkPage },
    setup: () => ({ config: cars2 }),
    template: '<LkPage :config="config" />'
  })
}
