// Сервисы на главной и внешние в палитре команд (Ctrl+K) — один список: адрес меняется здесь, а не в двух местах.
// Свои страницы ещё и в боковой панели (AppSidebar) — у неё свой порядок и пункты, которых нет на главной.
// Внешние открываются в новой вкладке. Адреса стендов — прямо в коде (решение владельца: без переменных окружения)

export type HubServiceGroup = 'texts' | 'design' | 'work'

export interface HubService {
  id: string
  title: string
  description: string
  icon: string
  to: string
  external: boolean
  group: HubServiceGroup
}

export const HUB_SERVICE_GROUPS: { id: HubServiceGroup, label: string }[] = [
  { id: 'texts', label: 'Тексты' },
  { id: 'design', label: 'Дизайн-система' },
  { id: 'work', label: 'Рабочие стенды' }
]

export const HUB_SERVICES: HubService[] = [
  {
    id: 'localizations',
    title: 'Локализации',
    description: 'Ключи и переводы всех продуктов: поиск, очередь перевода, выгрузка в код и в Figma.',
    icon: 'i-lucide-languages',
    to: '/localizations',
    external: false,
    group: 'texts'
  },
  {
    id: 'mcp',
    title: 'MCP для нейросетей',
    description: 'Токен и инструкция: Claude Code ищет строки, заводит ключи и пишет черновые переводы.',
    icon: 'ri:robot-2-line',
    to: '/ai',
    external: false,
    group: 'texts'
  },
  {
    id: 'storybook',
    title: 'Storybook',
    description: 'Компоненты, токены и темы, целые экраны пейволлов и лендингов.',
    icon: 'i-lucide-book-open',
    to: 'https://amaya-storybook.vercel.app',
    external: true,
    group: 'design'
  },
  {
    id: 'emulator',
    title: 'Эмулятор InApp',
    description: 'Пейволлы и онбординги в рамке устройства: покупка, закрытие, лог событий.',
    icon: 'i-lucide-smartphone',
    to: 'https://inapp-preview.vercel.app',
    external: true,
    group: 'design'
  },
  {
    id: 'landings',
    title: 'Лендинги',
    description: 'Лендинги Cars 2 и Farm на дизайн-системе, на всех языках.',
    icon: 'i-lucide-layout-template',
    to: 'https://landings-six-henna.vercel.app',
    external: true,
    group: 'design'
  },
  {
    id: 'webviews',
    title: 'WebViews',
    description: 'Все варианты InApp из тестов — только просмотр.',
    icon: 'i-lucide-app-window',
    to: 'https://inapp-webview-hub.b-cdn.net/?debugEnabled=1&mode=hyper',
    external: true,
    group: 'work'
  }
]

/** Домен внешнего сервиса для подписи на карточке: amaya-storybook.vercel.app */
export const serviceHost = (service: HubService) => (service.external ? new URL(service.to).host : '')
