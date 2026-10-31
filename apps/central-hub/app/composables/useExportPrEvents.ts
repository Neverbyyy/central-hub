import type { RealtimeChannel } from '@supabase/supabase-js'

// Одна подписка на канал export-pr на всю вкладку: supabase.channel() для той же темы возвращает тот же канал,
// поэтому бадж на кнопке и окно выгрузки слушают его вместе, а отписка одного не снимает подписку другого
const handlers = new Set<(set: string) => void>()
let channel: RealtimeChannel | null = null

/**
 * События выгрузки: кто-то нажал «Создать / Обновить PR» или вебхук GitHub сообщил о мерже. В событии только имя
 * набора — канал публичный, статус берётся с сервера. listen() — начать слушать, stop() — перестать.
 */
export function useExportPrEvents(handler: (set: string) => void) {
  const supabase = useSupabaseClient()

  const listen = () => {
    handlers.add(handler)
    if (channel) return
    channel = supabase
      .channel(EXPORT_PR_CHANNEL)
      .on('broadcast', { event: 'pr' }, ({ payload }) => {
        const set = (payload as { set?: unknown } | undefined)?.set
        if (typeof set === 'string') handlers.forEach(h => h(set))
      })
      .subscribe()
  }

  const stop = () => {
    handlers.delete(handler)
    if (handlers.size || !channel) return
    supabase.removeChannel(channel)
    channel = null
  }

  return { listen, stop }
}
