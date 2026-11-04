// Лендинги целиком — те же страницы, что в apps/landings, с теми же конфигами. Язык — из тулбара, размер — телефон 375
// (как макет), iPad 768, десктоп. Истории — по одной на папку app/landings: их добавляет .storybook/main.ts, поэтому новый
// лендинг появляется здесь сам. Название строится из имени папки: cars2-go → Cars 2 Go
import { LkPage } from '@amaya/landing-kit'
import { NO_SCREEN_STATE, NO_THEME } from '@amaya/ui/stories'
import { LANDINGS } from '../../landings/app/landings'

// Заголовок у каждой истории свой, его задаёт индекс в .storybook/main.ts
export default {
  parameters: { layout: 'fullscreen', themes: false },
  globals: { viewport: { value: 'phonePortraitS', isRotated: false }, ...NO_THEME, ...NO_SCREEN_STATE },
  argTypes: { landing: { control: false } },
  render: (args: { landing: string }) => ({
    components: { LkPage },
    setup: () => ({ config: LANDINGS[args.landing] }),
    template: '<LkPage :config="config" />'
  })
}
