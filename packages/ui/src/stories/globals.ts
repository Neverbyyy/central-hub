import { reactive, readonly } from 'vue'

// Состояние тулбара Storybook: тема, язык, «экран открыт / закрыт», «идёт покупка».
// Рендерер Vue при смене переключателя не пересоздаёт уже показанную историю, а только заново вызывает декораторы.
// Поэтому декоратор (apps/storybook/.storybook/preview.ts) пишет состояние сюда, в reactive, и смонтированная
// история перерисовывается сама. Модуль общий: его берут истории пакетов и экранов apps/inapp-preview
export interface StoryGlobals {
  theme: string
  locale: string
  screen: 'open' | 'closed'
  purchasing: boolean
}

export const storyGlobals = reactive<StoryGlobals>({
  theme: 'base',
  locale: 'en',
  screen: 'open',
  purchasing: false
})

/** Для историй: тема, язык, «экран открыт / закрыт» и «идёт покупка» из тулбара. */
export const useStoryEnv = () => readonly(storyGlobals)

// Кнопки тулбара, которые на истории ничего не меняют. Значение в `globals` истории Storybook закрепляет, и кнопка
// становится серой — видно, что она здесь не действует. Новая история: компонент — `globals: NO_SCREEN_STATE`
/** «Покупка» нужна только целым пейволлам. */
export const NO_PURCHASE = { purchasing: 'idle' }
/** «Экран» и «покупка» читают только целые экраны (и слайды, которые крутятся на открытом экране). */
export const NO_SCREEN_STATE = { screen: 'open', ...NO_PURCHASE }
/** Экран или лендинг берут тему из своего конфига, страницы токенов показывают все темы сразу. */
export const NO_THEME = { theme: 'base' }
/** На истории нет текстов из сервиса. */
export const NO_LOCALE = { locale: 'en' }
