import { en, ru, uz } from '@nuxt/ui/locale'

// Встроенные надписи Nuxt UI (кнопки календаря, «Закрыть», «Нет данных») под язык интерфейса; узбекский у них — латиницей,
// как и наш словарь. Три маленьких словаря — дешевле, чем грузить их отдельно
const UI_LOCALES = { ru, en, uz }

export const uiLocale = (locale: HubLocale) => UI_LOCALES[locale]
