import type { RealtimeChannel } from '@supabase/supabase-js'

// Паузы перед новой попыткой: 5 с, 15 с, дальше — раз в 30 с
const RETRY = [5_000, 15_000, 30_000]

/**
 * Подписка Realtime, которая переживает обрыв. Канал закрылся (сон ноутбука, смена сети, лимит сервера) — убрать его
 * и подключиться снова с паузой; иначе вкладка застыла бы до перезагрузки. Одна на грид и присутствие.
 *
 * build — собрать канал с обработчиками (вызывается на каждую попытку); onUp — канал на связи, в том числе снова;
 * onDown — связь пропала. Возвращает stop: отписаться и больше не подключаться.
 */
export function subscribeWithRetry(
  supabase: { removeChannel: (channel: RealtimeChannel) => unknown },
  build: () => RealtimeChannel,
  { onUp, onDown }: { onUp?: (channel: RealtimeChannel) => void, onDown?: () => void } = {}
) {
  let channel: RealtimeChannel | null = null
  let stopped = false
  let attempts = 0
  let retryTimer: ReturnType<typeof setTimeout> | undefined

  const connect = () => {
    const current = build()
    channel = current
    current.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        attempts = 0
        onUp?.(current)
        return
      }
      // channel === current: removeChannel сам закрывает канал — этот CLOSED уже не про текущую попытку
      if ((status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') && !stopped && channel === current) {
        channel = null
        supabase.removeChannel(current)
        onDown?.()
        clearTimeout(retryTimer)
        retryTimer = setTimeout(connect, RETRY[Math.min(attempts++, RETRY.length - 1)])
      }
    })
  }

  connect()

  return () => {
    stopped = true
    clearTimeout(retryTimer)
    if (channel) supabase.removeChannel(channel)
    channel = null
  }
}
