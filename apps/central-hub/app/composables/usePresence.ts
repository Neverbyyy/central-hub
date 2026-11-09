import type { RealtimeChannel } from '@supabase/supabase-js'
import type { PresenceCell, PresenceMeta, PresencePerson } from '~/utils/presence'

// Присутствие через Supabase Realtime (тот же канал связи, что у грида): в базу ничего не пишется.
// Одна подписка на вкладку — её открывает лейаут; шапка, грид и очередь читают общее состояние.
// Вкладка — ключ присутствия: у человека с двумя вкладками две записи, в шапке он один
let tab = ''
let channel: RealtimeChannel | null = null

const usePeople = () => useState<PresencePerson[]>('presence-people', () => [])
const useEditing = () => useState<PresenceCell | null>('presence-editing', () => null)

export function usePresence() {
  const people = usePeople()
  const editing = useEditing()
  const user = useHubUser()
  const self = computed(() => ({ tab, name: user.value.name }))

  // Кто ещё в сервисе — для шапки
  const others = computed(() => presenceOthers(people.value, self.value))
  // Кто что правит: ключ → язык → имена — для меток на ячейках
  const editors = computed(() => presenceEditors(people.value, self.value))

  // Что правит этот человек: ячейку грида, в шторке или в очереди; null — ничего
  const setEditing = (cell: PresenceCell | null) => {
    const same = cell && editing.value && cell.key === editing.value.key && cell.lang === editing.value.lang
    if (!same && (cell || editing.value)) editing.value = cell ? { key: cell.key, lang: cell.lang } : null
  }

  return { others, editors, setEditing }
}

/** Подключение — одно на вкладку, из лейаута: шлёт имя, страницу и правку, принимает остальных. */
export function usePresenceConnection() {
  const supabase = useSupabaseClient()
  const route = useRoute()
  const user = useHubUser()
  const people = usePeople()
  const editing = useEditing()
  let subscribed = false

  // Человек не представился — его не видно, но других он видит
  const send = () => {
    if (!channel || !subscribed) return
    const meta: PresenceMeta | null = user.value.name
      ? { name: user.value.name, page: String(route.meta.title ?? route.path), editing: editing.value }
      : null
    if (meta) channel.track(meta)
    else channel.untrack()
  }

  onMounted(() => {
    tab ||= globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)
    const current = supabase.channel('hub-presence', { config: { presence: { key: tab } } })
    channel = current
    current
      .on('presence', { event: 'sync' }, () => {
        people.value = presencePeople(current.presenceState() as Record<string, unknown[]>)
      })
      .subscribe((status) => {
        subscribed = status === 'SUBSCRIBED'
        if (subscribed) send()
      })
  })

  watch([() => user.value.name, () => route.meta.title ?? route.path, editing], send)

  onBeforeUnmount(() => {
    if (channel) supabase.removeChannel(channel)
    channel = null
    subscribed = false
    people.value = []
  })
}
