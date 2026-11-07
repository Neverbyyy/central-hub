import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// Готовая сборка для InApp: у него нет Tailwind, Vite 4 и цель es2015, поэтому исходники дизайн-системы он собрать не может.
// Не режим библиотеки: он встроил бы шрифты в CSS как base64 — сотни килобайт на каждый экран. Здесь они отдельные файлы.
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  // Адреса шрифтов относительно CSS: сборка InApp сама заберёт файлы из пакета
  base: './',
  build: {
    target: 'es2015',
    minify: false,
    cssCodeSplit: false,
    cssMinify: false,
    modulePreload: false,
    // Шрифты отдельными файлами, какого бы размера они ни были
    assetsInlineLimit: 0,
    rollupOptions: {
      input: { index: 'src/index.ts', plural: 'src/plural.ts' },
      preserveEntrySignatures: 'strict',
      external: ['vue', 'vue-i18n', '@rive-app/webgl2'],
      output: {
        format: 'es',
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: info => (info.names.some(name => name.endsWith('.css')) ? 'style.css' : 'fonts/[name][extname]')
      }
    }
  }
})
