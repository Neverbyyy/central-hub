// Nunito первого экрана (заголовок и кнопка) — preload: шрифт приходит вместе со страницей, текст не перескакивает
// с запасного шрифта на свой. Тот же файл, что в @font-face (Vite отдаёт его по одному адресу)
import nunito from '@fontsource-variable/nunito/files/nunito-latin-wght-normal.woff2?url'
import { defineNuxtPlugin, useHead } from 'nuxt/app'

export default defineNuxtPlugin(() => {
  useHead({ link: [{ rel: 'preload', as: 'font', type: 'font/woff2', href: nunito, crossorigin: '' }] })
})
