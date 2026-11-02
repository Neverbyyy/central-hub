import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// Экраны и эмулятор InApp: Vue и Tailwind 4 с пресетом дизайн-системы (src/style.css)
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  build: {
    // Арт экранов — отдельными файлами с хешем, не встраивается в JS
    assetsInlineLimit: 0
  }
})
