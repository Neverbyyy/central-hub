// Общие типы пропсов компонентов: отдельно от .vue, чтобы их можно было импортировать в экраны и истории

// Текстовые стили — токены text.* (packages/tokens/src/size): размер, интерлиньяж и вес свои у темы и брейкпоинта
export const DS_TEXT_VARIANTS = [
  'display-lg', 'display-md', 'title-lg', 'title-md', 'body-lg', 'body', 'list', 'caption', 'price', 'button', 'badge', 'legal', 'link'
] as const
export type DsTextVariant = typeof DS_TEXT_VARIANTS[number]

export const DS_TEXT_TONES = ['primary', 'secondary', 'muted', 'inverse', 'accent', 'positive', 'link', 'inherit'] as const
export type DsTextTone = typeof DS_TEXT_TONES[number]

export type DsStore = 'app-store' | 'google-play'

export interface DsStoreBadge {
  href: string
  // Значок на языке страницы — у Apple и Google они свои для каждого языка
  src: string
  // Подпись для скринридера, ключом из сервиса
  label: string
}

// Тариф для DsPlanPicker: тексты уже переведены экраном, цены — строки из стора
export interface DsPlan {
  // Уникально в группе: обычно ID продукта
  key: string
  title?: string
  subtitle?: string
  price?: string
  period?: string
  // Выгода зелёным: «3 days free»
  note?: string
  // Плашка в углу: «Best offer»
  badge?: string
  // Свои цвета тарифа: рамка и фон выбранного
  tint?: 'sky' | 'violet' | 'pink'
  // Название и цена жирные
  emphasis?: boolean
}
