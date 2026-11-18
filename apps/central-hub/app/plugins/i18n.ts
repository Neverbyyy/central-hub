// Язык интерфейса сервиса — из cookie (выбор в «Настройках», по умолчанию русский). Сервер рисует страницу сразу на нём,
// клиент берёт тот же выбор — без подмены текста при загрузке. В сборку страницы попадает словарь только этого языка
import { createI18n } from 'vue-i18n'

export default defineNuxtPlugin({
  name: 'hub-i18n',
  // До плагинов и страниц, которые уже показывают текст
  enforce: 'pre',
  async setup(nuxtApp) {
    const cookie = useCookie(HUB_LOCALE_COOKIE)
    const locale = isHubLocale(cookie.value) ? cookie.value : DEFAULT_HUB_LOCALE
    const i18n = createI18n({
      legacy: false,
      locale,
      fallbackLocale: false,
      pluralRules: hubPluralRules,
      // Пропущенный ключ виден в dev сразу в консоли; в сборке его ловит тест словарей
      missingWarn: import.meta.dev,
      fallbackWarn: false
    })
    // Словарь — как при смене языка (useHubLocale): createI18n со своими типами словарей с нашим JSON не дружит
    i18n.global.setLocaleMessage(locale, await loadHubMessages(locale))
    nuxtApp.vueApp.use(i18n)
  }
})
