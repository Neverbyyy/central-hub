// Тексты из сервиса локализации — только утверждённые, через `pnpm l10n pull` (@amaya/locales). vue-i18n создаётся
// без текстов: страница подгружает свой язык (useLocale) — в сборку не попадают все 9 языков сразу.
// На сервере у каждого запроса свой экземпляр приложения, значит, и свой язык. Нет перевода — английский
import { pluralRules } from '@amaya/locales/lazy'
import { defineNuxtPlugin } from 'nuxt/app'
import { createI18n } from 'vue-i18n'

export default defineNuxtPlugin((nuxtApp) => {
  const i18n = createI18n({ legacy: false, locale: 'en', fallbackLocale: 'en', messages: {}, pluralRules, missingWarn: false, fallbackWarn: false })
  nuxtApp.vueApp.use(i18n)
})
