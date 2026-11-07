// Страница дизайн-системы внутри чужого приложения (amaya: { embedded: true }): стили, шрифт и wasm Rive подключаются
// здесь, а не глобально, и остальные страницы хоста их не получают. Вызывается в <script setup> страницы: useDsPage().
// Страницу хост подгружает отдельным чанком (defineAsyncComponent), иначе этот импорт попадёт в общий файл
import '#build/amaya-ds.css'
import { preloadFont, useOwnRiveWasm } from './assets'

export function useDsPage(): void {
  preloadFont()
  if (import.meta.client) useOwnRiveWasm()
}
