// Заглушка окружения для Storybook и тестов: данные задаёт история, покупка заканчивается так, как выбрано
// в панели (успех, отмена, ошибка или «идёт» без конца). Все вызовы экрана пишутся в лог — сразу видны дубли.
import { createEmitter, type PaywallData, type PaywallEnv, type PurchaseResult, type TrackProps } from './env'

export type StubOutcome = PurchaseResult | 'pending'

export interface StubCall {
  name: 'ready' | 'close' | 'purchase' | 'restore' | 'openLegal' | 'track'
  args: unknown[]
}

export interface StubEnvOptions {
  data: PaywallData
  outcome?: StubOutcome
  // Сколько идёт покупка, мс
  purchaseDelay?: number
  onCall?: (call: StubCall) => void
}

export interface StubEnv extends PaywallEnv {
  /** Приложение показывает экран. */
  open: () => void
  /** Приложение закрывает экран само. */
  closeFromApp: () => void
  /** Новые данные от приложения. */
  setData: (data: PaywallData) => void
  setOutcome: (outcome: StubOutcome) => void
  readonly calls: StubCall[]
}

export function createStubEnv(options: StubEnvOptions): StubEnv {
  const emitter = createEmitter()
  let data = options.data
  let outcome: StubOutcome = options.outcome ?? 'success'
  const calls: StubCall[] = []
  const log = (name: StubCall['name'], ...args: unknown[]) => {
    const call = { name, args }
    calls.push(call)
    options.onCall?.(call)
  }

  return {
    calls,
    data: () => data,
    on: emitter.on,
    ready: () => log('ready'),
    close: () => log('close'),
    purchase: (productId: string) => {
      log('purchase', productId)
      const result = outcome
      if (result === 'pending') return new Promise<PurchaseResult>(() => {})
      return new Promise(resolve => setTimeout(() => resolve(result), options.purchaseDelay ?? 1200))
    },
    restore: () => log('restore'),
    openLegal: doc => log('openLegal', doc),
    track: (event: string, props?: TrackProps) => log('track', event, props),
    open: () => emitter.emit('open'),
    closeFromApp: () => emitter.emit('close'),
    setData: (next) => {
      data = next
      emitter.emit('data', next)
    },
    setOutcome: (next) => {
      outcome = next
    }
  }
}
