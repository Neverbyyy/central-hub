import { messages, pluralRules } from '@amaya/locales'
import { createI18n } from 'vue-i18n'

// Тексты — из сервиса локализации, вшиты при сборке (@amaya/locales). Язык ставит экран по данным приложения
export const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages,
  pluralRules,
  missingWarn: false,
  fallbackWarn: false
})
