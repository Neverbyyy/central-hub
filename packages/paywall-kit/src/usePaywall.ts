// Общая логика пейволла: открыт ли экран, «готов» только когда загрузились арт, шрифт и цены, покупка с блокировкой,
// закрытие, сброс при повторном открытии, «нет продукта — экран не показывается». Шаблоны экранов берут её отсюда
// и не повторяют. API Vue 3.3, как в InApp (toValue есть с 3.3).
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, toValue, watch, type MaybeRefOrGetter } from 'vue'
import type { LegalDoc, PaywallData, PaywallEnv, PurchaseResult, TrackProps } from './env'

export interface UsePaywallOptions {
  env: PaywallEnv
  // Продукты, без цены которых экран не показывается
  required: MaybeRefOrGetter<string[]>
  // Что ещё ждать перед «готов»: например 'art' — экран отмечает markLoaded('art'), когда картинка загрузилась
  waitFor?: string[]
  // Если арт так и не загрузился (сеть), через столько мс экран всё равно сообщает «готов» — иначе его не покажут вовсе
  readyTimeout?: number
  // Пауза перед «закрыть»: успевает сыграть уход экрана
  closeDelay?: number
  // Для Storybook: показать «идёт покупка» без настоящей покупки
  forcePurchasing?: MaybeRefOrGetter<boolean>
}

export function usePaywall(options: UsePaywallOptions) {
  const { env } = options
  const data = shallowRef<PaywallData | null>(env.data())
  const opened = ref(false)
  // Номер показа: растёт при каждом open — шаблоны по нему сбрасывают выбор тарифа, попапы и карусели
  const session = ref(0)
  const purchasing = ref<string | null>(null)
  const loaded = ref<Record<string, boolean>>({})
  const fontsReady = ref(false)
  let readySent = false
  let closedUnavailable = false
  let readyTimer: ReturnType<typeof setTimeout> | undefined

  const prices = computed(() => new Map((data.value?.products ?? []).map(product => [product.id, product.price])))
  const price = (id: string) => prices.value.get(id) ?? null
  const owns = (id: string) => !!data.value?.owned.includes(id)
  const wasTrial = computed(() => !!data.value?.wasTrial)
  // Нет цены у нужного продукта — экран не показывается (в InApp цена была бы «$—»)
  const unavailable = computed(() => !!data.value && toValue(options.required).some(id => !price(id)))
  const busy = computed(() => !!purchasing.value || !!toValue(options.forcePurchasing))

  const markLoaded = (name: string) => {
    loaded.value = { ...loaded.value, [name]: true }
  }

  const startReadyTimer = () => {
    clearTimeout(readyTimer)
    readyTimer = setTimeout(() => {
      for (const name of options.waitFor ?? []) markLoaded(name)
    }, options.readyTimeout ?? 5000)
  }

  const offs = [
    env.on('data', (next) => {
      data.value = next
      // InApp присылает «готов» заново на каждые новые данные — так же
      readySent = false
      closedUnavailable = false
      startReadyTimer()
    }),
    env.on('open', () => {
      opened.value = true
      session.value++
    }),
    env.on('close', () => {
      opened.value = false
      purchasing.value = null
    })
  ]

  const checkReady = () => {
    if (!data.value) return
    if (unavailable.value) {
      if (!closedUnavailable) {
        closedUnavailable = true
        env.close()
      }
      return
    }
    const assetsReady = (options.waitFor ?? []).every(name => loaded.value[name])
    if (!readySent && fontsReady.value && assetsReady) {
      readySent = true
      env.ready()
    }
  }

  onMounted(() => {
    // Следим только после монтирования: required шаблона может зависеть от его же computed, объявленных ниже
    watch([data, unavailable, fontsReady, loaded], checkReady, { immediate: true })
    if (data.value) startReadyTimer()
    const fonts = typeof document !== 'undefined' ? document.fonts : undefined
    if (fonts) fonts.ready.then(() => {
      fontsReady.value = true
    })
    else fontsReady.value = true
  })

  onBeforeUnmount(() => {
    offs.forEach(off => off())
    clearTimeout(readyTimer)
  })

  /** Купить продукт. Пока идёт покупка, вторая не начинается; успех закрывает экран, отмена и ошибка — нет. */
  const purchase = async (productId: string): Promise<PurchaseResult | null> => {
    if (busy.value || !opened.value) return null
    purchasing.value = productId
    const result = await env.purchase(productId)
    purchasing.value = null
    if (result === 'success') {
      opened.value = false
      env.close()
    }
    return result
  }

  let closeTimer: ReturnType<typeof setTimeout> | undefined
  /** Экран просит закрыть: сначала уходит сам, потом сообщает приложению. Во время покупки не закрывается. */
  const close = () => {
    if (!opened.value || busy.value) return
    opened.value = false
    clearTimeout(closeTimer)
    closeTimer = setTimeout(() => env.close(), options.closeDelay ?? 250)
  }
  onBeforeUnmount(() => clearTimeout(closeTimer))

  return {
    data,
    opened,
    session,
    wasTrial,
    unavailable,
    purchasing,
    busy,
    price,
    owns,
    markLoaded,
    purchase,
    close,
    restore: () => {
      if (!busy.value) env.restore()
    },
    openLegal: (doc: LegalDoc) => {
      if (!busy.value) env.openLegal(doc)
    },
    track: (event: string, props?: TrackProps) => env.track(event, props)
  }
}

export type Paywall = ReturnType<typeof usePaywall>
