// https://nuxt.com/docs/api/configuration/nuxt-config
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

  // Только сервер: NUXT_HUB_PASSWORD, NUXT_SESSION_PASSWORD и NUXT_CLI_TOKEN
  runtimeConfig: {
    hubPassword: '',
    sessionPassword: '',
    cliToken: ''
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
    }
  },

  // CJS-зависимости собираем заранее, иначе dev-сервер перезагружает страницу при первом открытии грида
  vite: {
    optimizeDeps: {
      include: ['jszip', '@rive-app/webgl2']
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
