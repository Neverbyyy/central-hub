import { useI18n } from 'vue-i18n'
import type { Translate } from '../../shared/utils/plural'

/**
 * Язык интерфейса: какой сейчас и как сменить. Словарь нового языка подгружается при первом выборе, выбор — в cookie
 * на год: сервер следующей страницы и ошибки API сразу на нём. Вызывать в setup.
 */
export function useHubLocale() {
  const { locale, availableLocales, setLocaleMessage } = useI18n()
  const cookie = useCookie(HUB_LOCALE_COOKIE, { maxAge: 60 * 60 * 24 * 365, sameSite: 'lax', path: '/' })

  const current = computed(() => (isHubLocale(locale.value) ? locale.value : DEFAULT_HUB_LOCALE))

  const setLocale = async (next: HubLocale) => {
    if (!availableLocales.includes(next)) setLocaleMessage(next, await loadHubMessages(next))
    locale.value = next
    cookie.value = next
  }

  return { locale: current, setLocale }
}

/** Язык интерфейса для форматтеров вне компонентов (даты, списки): из приложения этого запроса, иначе — по умолчанию. */
export function currentHubLocale(): HubLocale {
  const value = tryUseNuxtApp()?.vueApp.config.globalProperties.$i18n?.locale
  return isHubLocale(value) ? value : DEFAULT_HUB_LOCALE
}

/**
 * Перевод вне компонента (утилиты, обработчики ошибок): тем же словарём, что $t в шаблонах, через приложение этого
 * запроса. Без приложения (тест) — сам ключ
 */
export const hubT: Translate = (key, params = {}, plural) => {
  const t = tryUseNuxtApp()?.vueApp.config.globalProperties.$t
  if (!t) return key
  if (typeof params === 'number') return t(key, params)
  return plural === undefined ? t(key, params) : t(key, params, plural)
}
