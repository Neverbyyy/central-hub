// Окружение по протоколу InApp: так экран разговаривает с приложением в вебвью (InApp App.vue и useBridge).
// Приложение → экран: window.eventFn(event, data) или postMessage { eventName, data } — data, open, close,
// payment (success / иначе), hideProcessing. Экран → приложение: адреса uniwebview://<команда>?… — в iframe
// (режим hyper, эмулятор apps/inapp-preview) через postMessage { instance: 'inapp', url }, иначе переходом по адресу.
// Переходы по адресам идут по очереди, как в useBridge: два перехода в одном такте вебвью может потерять.
// Родительского гейта здесь нет — внутри InApp его показывает сам InApp (будет его реализация окружения).
import { createEmitter, type LegalDoc, type PaywallData, type PaywallEnv, type PurchaseResult } from './env'

// Данные InApp (тип AppData): только то, что нужно экрану
interface InAppPurchase {
  Product?: { ProductId?: string }
}

export interface InAppData {
  locale?: string
  variant?: string
  wasTrial?: boolean
  productData?: { Id: string, Price: string | null }[]
  purchases?: {
    ActiveSubscriptions?: InAppPurchase[]
    NonConsumable?: InAppPurchase[]
  }
}

/** AppData InApp → данные экрана. Купленным считаем активные подписки и разовые покупки. */
export function fromInAppData(raw: InAppData): PaywallData {
  const owned = [...raw.purchases?.ActiveSubscriptions ?? [], ...raw.purchases?.NonConsumable ?? []]
    .map(purchase => purchase.Product?.ProductId)
    .filter((id): id is string => !!id)
  return {
    locale: raw.locale || 'en',
    variant: raw.variant,
    wasTrial: !!raw.wasTrial,
    owned,
    products: (raw.productData ?? []).map(product => ({ id: product.Id, price: product.Price ?? null }))
  }
}

// Подписки InApp отличает от разовых покупок по типу продукта; в ID у нас период есть только у подписок
const SUBSCRIPTION = /\.(weekly|monthly|yearly)\./

/**
 * Данные экрана → AppData InApp: так их присылает приложение. Нужна эмулятору — он играет роль InApp, и пресеты
 * уходят в экран в том же виде, что из приложения, через тот же разбор (fromInAppData).
 */
export function toInAppData(data: PaywallData): InAppData {
  const purchase = (id: string): InAppPurchase => ({ Product: { ProductId: id } })
  return {
    locale: data.locale,
    variant: data.variant,
    wasTrial: data.wasTrial,
    productData: data.products.map(product => ({ Id: product.id, Price: product.price })),
    purchases: {
      ActiveSubscriptions: data.owned.filter(id => SUBSCRIPTION.test(id)).map(purchase),
      NonConsumable: data.owned.filter(id => !SUBSCRIPTION.test(id)).map(purchase)
    }
  }
}

export interface UniwebviewEnvOptions {
  // Адреса документов юрлица: у Amaya (as) — amayakids.com/terms.html и privacy.html
  legal: Record<LegalDoc, string>
  // Куда слать адреса; по умолчанию — родителю в iframe или переходом
  send?: (url: string) => void
}

const defaultSend = (url: string) => {
  if (window.parent !== window) window.parent.postMessage({ instance: 'inapp', url }, '*')
  else window.location.href = url
}

// JSON → base64 через UTF-8: у InApp btoa(JSON.stringify(…)) падает на нелатинских буквах
const base64 = (value: unknown) => {
  let binary = ''
  for (const byte of new TextEncoder().encode(JSON.stringify(value))) binary += String.fromCharCode(byte)
  return btoa(binary)
}

export function createUniwebviewEnv(options: UniwebviewEnvOptions): PaywallEnv & { dispose: () => void } {
  const emitter = createEmitter()
  const send = options.send ?? defaultSend
  let data: PaywallData | null = null
  let pending: ((result: PurchaseResult) => void) | null = null
  let pendingPurchase: Promise<PurchaseResult> | null = null

  let queue = Promise.resolve()
  const command = (name: string, params?: Record<string, string>) => {
    const query = params ? new URLSearchParams(params).toString() : ''
    const url = `uniwebview://${name}${query ? `?${query}` : ''}`
    queue = queue.then(() => new Promise<void>((resolve) => {
      send(url)
      setTimeout(resolve, 0)
    }))
  }

  const settle = (result: PurchaseResult) => {
    const resolve = pending
    pending = null
    pendingPurchase = null
    resolve?.(result)
  }

  const process = (event: string, payload: unknown) => {
    if (event === 'data') {
      data = fromInAppData((typeof payload === 'string' ? JSON.parse(payload) : payload) as InAppData)
      emitter.emit('data', data)
    } else if (event === 'open') {
      emitter.emit('open')
    } else if (event === 'close') {
      emitter.emit('close')
    } else if (event === 'payment') {
      settle(payload === 'success' ? 'success' : payload === 'cancel' ? 'cancel' : 'error')
    } else if (event === 'hideProcessing') {
      // Приложение убрало загрузку без итога — считаем, что покупку отменили
      settle('cancel')
    }
  }

  const onMessage = (message: MessageEvent) => {
    const payload = message.data as { eventName?: string, data?: unknown } | null
    if (payload && typeof payload.eventName === 'string') process(payload.eventName, payload.data)
  }
  const target = window as unknown as { eventFn?: (event: string, data: unknown) => void }
  target.eventFn = process
  window.addEventListener('message', onMessage)
  // Страница загрузилась — как InApp: приложение после этого присылает данные. Первым в очереди
  command('loaded', { done: '1' })

  return {
    data: () => data,
    on: emitter.on,
    ready: () => command('ready'),
    close: () => command('close', { method: '1' }),
    purchase: (productId: string) => {
      // Вторая покупка, пока идёт первая, — та же покупка, второй buy приложению не уходит
      if (pendingPurchase) return pendingPurchase
      command('buy', { Id: productId })
      pendingPurchase = new Promise<PurchaseResult>((resolve) => {
        pending = resolve
      })
      return pendingPurchase
    },
    restore: () => command('restorePurchases'),
    openLegal: doc => command('openLink', { url: options.legal[doc] }),
    track: (event, props) => {
      // Прокрутка слайдов — отдельная команда InApp (appDataStore.mixpanelEventInappScroll)
      if (event === 'inapp_scroll') {
        command('mixpanelEventInappScroll', { page_number: String(props?.page_number ?? 1) })
        return
      }
      const additionalProperties = Object.entries(props ?? {}).map(([key, value]) => ({ key, value }))
      command('mixpanelEvent', { data: base64({ eventName: event, additionalProperties }) })
    },
    dispose: () => {
      window.removeEventListener('message', onMessage)
      if (target.eventFn === process) delete target.eventFn
      settle('cancel')
    }
  }
}
