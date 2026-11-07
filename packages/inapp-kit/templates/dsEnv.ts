// Окружение экранов дизайн-системы внутри InApp: PaywallEnv поверх его mitt и сторов. Кладётся в src/utils/dsEnv.ts.
// createUniwebviewEnv здесь не подходит: он перезаписывает window.eventFn, которым владеет App.vue, и говорит с приложением сам.
import { onUnmounted, watchEffect } from 'vue'
import { createEmitter, fromInAppData, type LegalDoc, type PaywallData, type PaywallEnv, type PurchaseResult } from '@amaya/inapp-kit'
import mitt from '@/plugins/mitt'
import { useAppDataStore } from '@/stores/appDataStore'
import { useDeviceStore } from '@/stores/deviceStore'
import { useProductsStore } from '@/stores/productsStore'
import { getDuoPose } from '@/utils/iphoneDuoGeometry'

export interface DsEnvOptions {
  // Адреса документов юрлица, как linkUrls в page-legal.vue
  legal: Record<LegalDoc, string>
}

const SIDES = ['top', 'right', 'bottom', 'left'] as const

export function useDsEnv(options: DsEnvOptions): PaywallEnv {
  const appDataStore = useAppDataStore()
  const deviceStore = useDeviceStore()
  const productsStore = useProductsStore()
  const emitter = createEmitter()

  let pending: ((result: PurchaseResult) => void) | null = null
  let pendingPurchase: Promise<PurchaseResult> | null = null
  // payment success: App.vue уже отправил приложению close, второй раз экран его не шлёт
  let closedByPayment = false

  const settle = (result: PurchaseResult) => {
    const resolve = pending
    pending = null
    pendingPurchase = null
    resolve?.(result)
  }

  const data = (): PaywallData | null => {
    const raw = appDataStore.appData
    if (!raw?.productData) return null
    // Вариант — выбранный правилами InApp: по нему экран берёт сегмент
    return { ...fromInAppData(raw), variant: appDataStore.selectedVariant || raw.variant }
  }

  const onData = () => {
    const next = data()
    if (next) emitter.emit('data', next)
  }
  const onOpen = () => emitter.emit('open')
  // close с true — приложение закрыло экран само, без него — payment success или сам экран
  const onClose = (fromApp?: unknown) => {
    if (pending) {
      closedByPayment = fromApp !== true
      settle(fromApp === true ? 'cancel' : 'success')
    }
    emitter.emit('close')
  }
  // App.vue прячет загрузку при итоге покупки, отличном от success, и по hideProcessing: для экрана это отказ
  const onFailed = () => settle('cancel')
  const onLegal = (doc: unknown) => {
    if (doc === 'terms' || doc === 'privacy') mitt.event('openLink', options.legal[doc])
  }

  mitt.listen('dataUpdate', onData)
  mitt.listen('open', onOpen)
  mitt.listen('close', onClose)
  mitt.listen('hideLoadingOverlay', onFailed)
  mitt.listen('parentalGateDecline', onFailed)
  mitt.listen('openLegal', onLegal)

  // Отступы iPhone Duo: экран сам держит кнопки в safe area, адаптер InApp ему не нужен
  const stopInsets = watchEffect(() => {
    const root = document.documentElement
    const pose = deviceStore.foldState ? getDuoPose(deviceStore.foldState, deviceStore.orientation) : null
    for (const side of SIDES) {
      if (pose) root.style.setProperty(`--ds-safe-${side}`, `${pose.insets[side]}px`)
      else root.style.removeProperty(`--ds-safe-${side}`)
    }
    if (pose) root.style.setProperty('--ds-safe-corner', `${Math.ceil(Math.max(...pose.radii) * (1 - Math.SQRT1_2))}px`)
    else root.style.removeProperty('--ds-safe-corner')
  })

  onUnmounted(() => {
    mitt.off('dataUpdate', onData)
    mitt.off('open', onOpen)
    mitt.off('close', onClose)
    mitt.off('hideLoadingOverlay', onFailed)
    mitt.off('parentalGateDecline', onFailed)
    mitt.off('openLegal', onLegal)
    stopInsets()
    settle('cancel')
  })

  return {
    data,
    on: emitter.on,
    ready: () => mitt.event('ready'),
    close: () => {
      if (closedByPayment) {
        closedByPayment = false
        return
      }
      mitt.event('close')
    },
    purchase: (productId) => {
      if (pendingPurchase) return pendingPurchase
      pendingPurchase = new Promise<PurchaseResult>((resolve) => {
        pending = resolve
      })
      // Сначала родительский гейт, как productsStore.buy. Своей загрузки InApp не показываем: она есть на кнопке экрана
      productsStore.callListner('openParentalGate', () => mitt.event('buy', productId))
      return pendingPurchase
    },
    restore: () => mitt.event('restorePurchases'),
    openLegal: doc => mitt.event('openParentalGateForLegal', doc),
    track: (event, props) => {
      if (event === 'inapp_scroll') {
        mitt.event('mixpanelEventInappScroll', props?.page_number ?? 1)
        return
      }
      mitt.event('mixpanelEvent', {
        eventName: event,
        additionalProperties: Object.entries(props ?? {}).map(([key, value]) => ({ key, value }))
      })
    }
  }
}
