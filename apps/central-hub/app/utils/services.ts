// Сервисы на главной и внешние в палитре команд (Ctrl+K) — один список: адрес меняется здесь, а не в двух местах.
// Свои страницы ещё и в боковой панели (AppSidebar) — у неё свой порядок и пункты, которых нет на главной.
// Внешние открываются в новой вкладке. Адреса стендов — прямо в коде (решение владельца: без переменных окружения).
// Названия и описания — в словаре интерфейса по id: home.services.<id>.title / .description, группы — home.groups.<id>

export type HubServiceGroup = 'texts' | 'design' | 'work'

export interface HubService {
  id: string
  icon: string
  to: string
  external: boolean
  group: HubServiceGroup
}

export const HUB_SERVICE_GROUPS: HubServiceGroup[] = ['texts', 'design', 'work']

export const HUB_SERVICES: HubService[] = [
  {
    id: 'localizations',
    icon: 'i-lucide-languages',
    to: '/localizations',
    external: false,
    group: 'texts'
  },
  {
    id: 'mcp',
    icon: 'ri:robot-2-line',
    to: '/ai',
    external: false,
    group: 'texts'
  },
  {
    id: 'storybook',
    icon: 'i-lucide-book-open',
    to: 'https://amaya-storybook.vercel.app',
    external: true,
    group: 'design'
  },
  {
    id: 'emulator',
    icon: 'i-lucide-smartphone',
    to: 'https://inapp-preview.vercel.app',
    external: true,
    group: 'design'
  },
  {
    id: 'landings',
    icon: 'i-lucide-layout-template',
    to: 'https://landings-six-henna.vercel.app',
    external: true,
    group: 'design'
  },
  {
    id: 'webviews',
    icon: 'i-lucide-app-window',
    to: 'https://inapp-webview-hub.b-cdn.net/?debugEnabled=1&mode=hyper',
    external: true,
    group: 'work'
  }
]

/** Домен внешнего сервиса для подписи на карточке: amaya-storybook.vercel.app */
export const serviceHost = (service: HubService) => (service.external ? new URL(service.to).host : '')
