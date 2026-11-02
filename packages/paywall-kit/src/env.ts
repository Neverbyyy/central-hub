// Один интерфейс связи экрана с окружением. Повторяет то, как работает InApp (App.vue, useBridge): приложение присылает
// данные (язык, продукты с ценами, был ли триал, что уже куплено), открывает и закрывает экран, сообщает итог покупки;
// экран отвечает «готов», «закрыть», «купить», «восстановить», «открыть документ» и шлёт события аналитики.
// Экран знает только этот интерфейс — не InApp, не mitt, не сторы. Реализации: заглушка для Storybook (stub.ts)
// и протокол InApp uniwebview:// (uniwebview.ts) — на нём работает эмулятор apps/inapp-preview.

export interface PaywallProduct {
  // ID продукта в сторе: com.amayasoft.cars2.yearly.trial3.3999
  id: string
  // Цена строкой от стора на языке пользователя: «$39.99», «39,99 €»; null — продукта нет
  price: string | null
}

export interface PaywallData {
  // Язык интерфейса приложения: en, ru, de…
  locale: string
  products: PaywallProduct[]
  // Триал уже был — экран не предлагает его снова (appData.wasTrial в InApp)
  wasTrial: boolean
  // ID продуктов, которые уже куплены: активные подписки и разовые покупки
  owned: string[]
  // Имя варианта у InApp (ios_as_cars2_tm11_varb_t1_pw_slider_v1): по нему экран берёт сегмент цен (t1, u, wout1)
  variant?: string
}

// Итог покупки: успех закрывает экран, отмена и ошибка возвращают к выбору тарифа
export type PurchaseResult = 'success' | 'cancel' | 'error'

export type LegalDoc = 'terms' | 'privacy'

export type TrackProps = Record<string, string | number | boolean>

export interface PaywallEnvEvents {
  // Пришли или обновились данные
  data: (data: PaywallData) => void
  // Приложение показало экран
  open: () => void
  // Приложение закрыло экран само
  close: () => void
}

export interface PaywallEnv {
  /** Последние данные от приложения; null — ещё не пришли. */
  data: () => PaywallData | null
  /** Подписка на события приложения; возвращает отписку. */
  on: <E extends keyof PaywallEnvEvents>(event: E, handler: PaywallEnvEvents[E]) => () => void
  /** Экран готов к показу: арт, шрифт и цены на месте. */
  ready: () => void
  /** Экран просит его закрыть. */
  close: () => void
  /** Купить продукт; обещание — итог покупки. Пока оно не выполнилось, идёт покупка. */
  purchase: (productId: string) => Promise<PurchaseResult>
  /** Восстановить покупки. */
  restore: () => void
  /** Открыть документ: условия или политику. Родительский гейт и адрес — дело окружения. */
  openLegal: (doc: LegalDoc) => void
  /** Событие аналитики. */
  track: (event: string, props?: TrackProps) => void
}

/** Простая подписка на события — общая для реализаций окружения. */
export function createEmitter() {
  const handlers = new Map<keyof PaywallEnvEvents, Set<(...args: never[]) => void>>()
  return {
    on<E extends keyof PaywallEnvEvents>(event: E, handler: PaywallEnvEvents[E]) {
      if (!handlers.has(event)) handlers.set(event, new Set())
      handlers.get(event)!.add(handler as (...args: never[]) => void)
      return () => {
        handlers.get(event)?.delete(handler as (...args: never[]) => void)
      }
    },
    emit<E extends keyof PaywallEnvEvents>(event: E, ...args: Parameters<PaywallEnvEvents[E]>) {
      for (const handler of handlers.get(event) ?? []) (handler as (...a: Parameters<PaywallEnvEvents[E]>) => void)(...args)
    }
  }
}
