// https://nuxt.com/docs/api/configuration/nuxt-config
import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@nuxtjs/supabase',
    '@vueuse/nuxt'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  // Тема — в «Настройках»: светлая или тёмная, без выбора — светлая. Выбор хранится в браузере,
  // класс ставится до отрисовки, поэтому страница не мигает
  colorMode: {
    preference: 'light',
    fallback: 'light'
  },

  // Только сервер: NUXT_HUB_PASSWORD, NUXT_SESSION_PASSWORD, NUXT_CLI_TOKEN, NUXT_MCP_TOKEN, NUXT_FIGMA_TOKEN,
  // NUXT_GITHUB_TOKEN и NUXT_EXPORT_REPOS (куда кнопка «Выгрузить в код» открывает PR),
  // NUXT_GITHUB_WEBHOOK_SECRET (подпись вебхука GitHub о событиях PR)
  runtimeConfig: {
    hubPassword: '',
    sessionPassword: '',
    cliToken: '',
    mcpToken: '',
    figmaToken: '',
    githubToken: '',
    exportRepos: '',
    githubWebhookSecret: ''
  },

  // l10n-core — TypeScript-исходники из workspace без сборки: их нужно встроить в бандл,
  // иначе собранный сервер попробует импортировать .ts из node_modules
  build: {
    transpile: ['@amaya/l10n-core']
  },

  // Ничего не пререндерим: статический HTML отдавался бы в обход пароля
  routeRules: {
    // Сервис внутренний — поисковикам его не показываем
    '/**': { headers: { 'X-Robots-Tag': 'noindex, nofollow' } }
  },

  compatibilityDate: '2025-01-15',

  nitro: {
    externals: {
      inline: ['@amaya/l10n-core']
    },
    // Исходники плагина Figma: сервис отдаёт их архивом со своим адресом (/api/figma/plugin.zip)
    serverAssets: [{ baseName: 'figma-plugin', dir: fileURLToPath(new URL('../../packages/figma-plugin/src', import.meta.url)) }],
    // Выгрузка в проекты — это сборка файлов плюс около десятка запросов к GitHub: даём функции запас
    vercel: {
      functions: { maxDuration: 60 }
    }
  },

  // CJS-зависимости собираем заранее, иначе dev-сервер перезагружает страницу при первом открытии грида.
  // cookie — по пути @supabase/ssr: модуль Supabase просит «@nuxtjs/supabase > cookie», а с MCP SDK
  // в проекте две версии cookie, и общая копия (0.7 от express) — не та, что импортирует @supabase/ssr (1.x)
  vite: {
    optimizeDeps: {
      include: ['jszip', '@nuxtjs/supabase > @supabase/ssr > cookie']
    }
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  supabase: {
    redirect: false,
    // Типы схемы пока не генерируются
    types: false
  }
})
