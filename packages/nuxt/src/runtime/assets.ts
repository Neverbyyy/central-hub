// Что нужно странице дизайн-системы кроме стилей: шрифт первого экрана и wasm Rive. Собственное приложение вызывает это
// из плагинов (fonts.ts, rive.client.ts), приложение-хост — только на нашей странице (useDsPage.ts)
import { configureRive } from '@amaya/ui'
import nunito from '@fontsource-variable/nunito/files/nunito-latin-wght-normal.woff2?url'
import wasm from '@rive-app/webgl2/rive.wasm?url'
import wasmFallback from '@rive-app/webgl2/rive_fallback.wasm?url'
import { useHead } from 'nuxt/app'

// Nunito первого экрана (заголовок и кнопка) — preload: шрифт приходит вместе со страницей, текст не перескакивает
// с запасного шрифта на свой. Тот же файл, что в @font-face (Vite отдаёт его по одному адресу)
export function preloadFont(): void {
  useHead({ link: [{ rel: 'preload', as: 'font', type: 'font/woff2', href: nunito, crossorigin: '' }] })
}

// wasm Rive — со своего адреса: рантайм по умолчанию берёт его с unpkg, а без внешней сети анимация не загрузится.
// Сам рантайм качается, только когда на странице появился DsRive
export function useOwnRiveWasm(): void {
  configureRive({ wasmUrl: wasm, wasmFallbackUrl: wasmFallback })
}
