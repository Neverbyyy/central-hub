// Лендинги: одно Nuxt-приложение, лендинги по путям — /cars2, с языком /cars2/ru. Все страницы собираются заранее
// (prerender) — на Vercel это статичный HTML без сервера: первый экран приходит сразу.
// Страницы закрыты от индексации: meta robots, заголовок X-Robots-Tag и robots.txt
import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// Лендинги — папки app/landings/<путь>, языки — файлы текстов набора ds (packages/locales/src/<язык>.json):
// добавили язык в сервисе и выгрузили тексты — после сборки появятся и его страницы
const landingsDir = fileURLToPath(new URL('./app/landings', import.meta.url))
const localesDir = fileURLToPath(new URL('../../packages/locales/src', import.meta.url))
const landings = readdirSync(landingsDir, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name)
const languages = readdirSync(localesDir).filter(file => file.endsWith('.json')).map(file => file.slice(0, -'.json'.length))

export default defineNuxtConfig({
  modules: ['@amaya/nuxt', '@nuxt/eslint'],

  devtools: { enabled: false },

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'robots', content: 'noindex, nofollow' }
      ],
      link: [{ rel: 'icon', href: 'data:,' }]
    }
  },

  routeRules: {
    '/**': { headers: { 'X-Robots-Tag': 'noindex, nofollow' } }
  },

  compatibilityDate: '2026-11-01',

  nitro: {
    prerender: {
      crawlLinks: false,
      // / — оглавление стенда: лендинги и кнопки языков
      routes: ['/', ...landings.flatMap(landing => [`/${landing}`, ...languages.filter(lang => lang !== 'en').map(lang => `/${landing}/${lang}`)])]
    }
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
