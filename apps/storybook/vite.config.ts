import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// Storybook берёт этот конфиг сам: Vue-компоненты и Tailwind 4 с пресетом дизайн-системы (.storybook/preview.css)
export default defineConfig({
  plugins: [vue(), tailwindcss()]
})
