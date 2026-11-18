// https://nuxt.com/docs/api/configuration/nuxt-config
import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@nuxtjs/supabase',
    '@vueuse/nuxt'
  ],

  // useI18n — без импорта в каждом компоненте, как остальные composables (язык интерфейса — app/plugins/i18n.ts)
  imports: {
    presets: [{ from: 'vue-i18n', imports: ['useI18n'] }]
  },

  devtools: {
    enabled: true
  },

  // Общее для всех страниц — и для страницы ошибки (app/error.vue), которая заменяет app.vue целиком.
  // Внутренний сервис: поисковикам не показываем (плюс X-Robots-Tag и robots.txt)
  app: {
    // Заголовок и язык страницы — в app.vue и error.vue: app.head действует только при серверном рендере, а они меняются
    // на клиенте (заголовок — у страниц, язык — в «Настройках»)
    head: {
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'robots', content: 'noindex, nofollow' }
      ],
      link: [{ rel: 'icon', href: '/favicon.ico' }]
    }
  },

  css: ['~/assets/css/main.css'],

  // Тема — в «Настройках»: светлая или тёмная, без выбора — светлая. Выбор хранится в браузере,
  // класс ставится до отрисовки, поэтому страница не мигает
  colorMode: {
    preference: 'light',
    fallback: 'light'
  },

  // Только сервер: NUXT_SESSION_PASSWORD (шифрует cookie сессии), вход через Google — NUXT_GOOGLE_CLIENT_ID,
  // NUXT_GOOGLE_CLIENT_SECRET (пускает рабочие аккаунты домена authDomain), вход по общему паролю — NUXT_HUB_PASSWORD,
  // NUXT_CLI_TOKEN, NUXT_MCP_TOKEN, NUXT_FIGMA_TOKEN,
  // NUXT_GITHUB_TOKEN и NUXT_EXPORT_REPOS (куда кнопка «Выгрузить в код» открывает PR),
  // NUXT_GITHUB_WEBHOOK_SECRET (подпись вебхука GitHub о событиях PR)
  runtimeConfig: {
    sessionPassword: '',
    googleClientId: '',
    googleClientSecret: '',
    // Домен Google Workspace компании: войти может любой рабочий аккаунт с ним, другие — нет. Не секрет;
    // для другого домена — NUXT_AUTH_DOMAIN
    authDomain: 'amayasoft.uz',
    // Общий пароль — второй вход рядом с Google; пусто — только Google
    hubPassword: '',
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

  // Ничего не пререндерим: статический HTML отдавался бы в обход входа
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
    // Флаги vue-i18n (как в packages/nuxt): без них он проверяет их на лету и старый API остаётся в сборке.
    // Компилятор сообщений нужен: словари — обычный JSON, собираются при первом показе
    define: {
      __VUE_I18N_LEGACY_API__: false,
      __VUE_I18N_FULL_INSTALL__: true,
      __INTLIFY_PROD_DEVTOOLS__: false,
      __INTLIFY_DROP_MESSAGE_COMPILER__: false
    },
    optimizeDeps: {
      include: ['jszip', '@nuxtjs/supabase > @supabase/ssr > cookie']
    }
  },

  hooks: {
    // Картинки не предзагружаем. Nuxt ставит <link rel="prefetch"> на каждую картинку, импортированную в коде, — на
    // всех страницах: картинки страницы ошибки (две темы × 1x/2x, ~150 КБ) скачивались бы при любом открытии сервиса.
    // Нужную и так возьмёт <img> там, где она показана
    'build:manifest': (manifest) => {
      for (const resource of Object.values(manifest)) {
        if (resource.resourceType === 'image') resource.prefetch = false
      }
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
    // Типы схемы — из локальной базы: pnpm db:types после каждой миграции
    types: '~/types/database.types.ts'
  }
})
