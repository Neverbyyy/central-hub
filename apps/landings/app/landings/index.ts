// Реестр лендингов: путь → конфиг. Новый лендинг — папка app/landings/<путь> с config.ts, здесь ничего дописывать не нужно.
// Страницы для сборки nuxt.config находит по тем же папкам, Storybook — тоже
import type { LandingConfig } from '@amaya/landing-kit'

const configs = import.meta.glob<LandingConfig>('./*/config.ts', { eager: true, import: 'default' })

// По имени папки: в путях дефис идёт раньше слеша, и cars2-go встал бы перед cars2
export const LANDINGS: Record<string, LandingConfig> = Object.fromEntries(
  Object.entries(configs).map(([path, config]) => [path.split('/')[1]!, config] as const).sort(([a], [b]) => a.localeCompare(b))
)
