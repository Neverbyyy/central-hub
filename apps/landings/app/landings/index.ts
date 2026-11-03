// Реестр лендингов: путь → конфиг. Новый лендинг — папка app/landings/<путь> с config.ts и art, строка здесь
// (страницы для сборки nuxt.config находит по папкам)
import type { LandingConfig } from '@amaya/landing-kit'
import { cars2 } from './cars2/config'

export const LANDINGS: Record<string, LandingConfig> = { cars2 }
