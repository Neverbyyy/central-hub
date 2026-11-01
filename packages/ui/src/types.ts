// Общие типы пропсов компонентов: отдельно от .vue, чтобы их можно было импортировать в экраны и истории

export type DsTextVariant = 'title-lg' | 'title-md' | 'button' | 'body' | 'caption' | 'badge'
export type DsTextTone = 'primary' | 'secondary' | 'inverse' | 'accent' | 'link' | 'inherit'

export type DsStore = 'app-store' | 'google-play'

export interface DsStoreBadge {
  href: string
  // Значок на языке страницы — у Apple и Google они свои для каждого языка
  src: string
  // Подпись для скринридера, ключом из сервиса
  label: string
}
