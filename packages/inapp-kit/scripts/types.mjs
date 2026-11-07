// Типы для пилота: InApp проверяет свои файлы через vue-tsc, и без объявлений пакет для него — неизвестный модуль.
// Точные типы шаблонов здесь не нужны: экран передаёт в них конфиг, который проверен в монорепо. В настоящем релизе — генерировать из исходников
import { writeFileSync } from 'node:fs'

const types = `import type { Component } from 'vue'

export type PurchaseResult = 'success' | 'cancel' | 'error'
export type LegalDoc = 'terms' | 'privacy'
export type TrackProps = Record<string, string | number | boolean>

export interface PaywallProduct {
  id: string
  price: string | null
}

export interface PaywallData {
  locale: string
  products: PaywallProduct[]
  wasTrial: boolean
  owned: string[]
  variant?: string
}

export interface PaywallEnvEvents {
  data: (data: PaywallData) => void
  open: () => void
  close: () => void
}

export interface PaywallEnv {
  data: () => PaywallData | null
  on: <E extends keyof PaywallEnvEvents>(event: E, handler: PaywallEnvEvents[E]) => () => void
  ready: () => void
  close: () => void
  purchase: (productId: string) => Promise<PurchaseResult>
  restore: () => void
  openLegal: (doc: LegalDoc) => void
  track: (event: string, props?: TrackProps) => void
}

export interface ScreenProps {
  env: PaywallEnv
  theme?: string
  forcePurchasing?: boolean
}

export type HeroSliderConfig = Record<string, any>
export type PlusConfig = Record<string, any>

export const PwHeroSlider: Component
export const PwPlusSplit: Component
export function createEmitter(): {
  on: PaywallEnv['on']
  emit: <E extends keyof PaywallEnvEvents>(event: E, ...args: Parameters<PaywallEnvEvents[E]>) => void
}
export function fromInAppData(raw: unknown): PaywallData
export function imageSetFromFiles(files: Record<string, string>, name: string): any
`

writeFileSync(new URL('../dist/index.d.ts', import.meta.url), types)
writeFileSync(new URL('../dist/plural.d.ts', import.meta.url), 'export const pluralRules: Record<string, (choice: number, choicesLength: number) => number>\n')
