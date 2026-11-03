import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// Storybook берёт этот конфиг сам: Vue-компоненты и Tailwind 4 с пресетом дизайн-системы (.storybook/preview.css)
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  // Рантайм Rive грузится динамическим импортом из @amaya/ui — Vite собирает его заранее, иначе на первой анимации
  // он пересобирает зависимости и перезагружает страницу
  optimizeDeps: { include: ['@rive-app/webgl2'] }
})
