// Словари интерфейса сервиса: app/locales/<язык>/<раздел>.json. Грузится только выбранный язык — остальные отдельными
// чанками, по требованию (переключили в «Настройках»). Все три словаря с одинаковыми ключами — это проверяет тест
import type { HubLocale } from '#shared/utils/hubLocale'

// Разделы словаря — обычный JSON; vue-i18n разбирает строки сам при первом показе
export type HubMessages = Record<string, unknown>

const LOADERS: Record<HubLocale, () => Promise<{ default: unknown }>> = {
  ru: () => import('~/locales/ru/index'),
  en: () => import('~/locales/en/index'),
  uz: () => import('~/locales/uz/index')
}

export const loadHubMessages = async (locale: HubLocale) => (await LOADERS[locale]()).default as HubMessages

// Правила множественного числа словарей — hubPluralRules в shared/utils/plural.ts: их берёт и тест словарей
