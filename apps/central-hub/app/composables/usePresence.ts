import type { RealtimeChannel } from '@supabase/supabase-js'
import type { PresenceCell, PresenceMeta, PresencePerson, PresenceSelf } from '~/utils/presence'

// Кто в сервисе и что правит — Supabase Realtime, без базы. Одна подписка на вкладку (её открывает лейаут),
// шапка, грид и очередь читают общее состояние. Вкладка — ключ: у человека с двумя вкладками две записи.
//
// Два способа доставки, потому что у присутствия жёсткий лимит: 5 обновлений (track / untrack) за 30 с на клиента,
// дальше сервер закрывает канал («Client presence rate limit exceeded»):
// - присутствие (track) — то, что меняется редко: имя и рабочий адрес, устройство, время входа; не чаще раза в 7 с,
//   уходит последнее состояние;
// - какую ячейку человек правит — сообщением (broadcast) сразу при смене. Сообщение не хранится, поэтому пока
//   человек правит, оно повторяется раз в 15 с, а новая вкладка просит остальных прислать своё («hello»).
//   Метка без повторов дольше 40 с и метка ушедшего человека пропадают
const TRACK_GAP = 7_000
const REPEAT = 15_000
const STALE = 40_000
const RETRY = [5_000, 15_000, 30_000]

let tab = ''
// Когда вкладку открыли: «в сервисе 12 мин»
let since = 0
let channel: RealtimeChannel | null = null

const usePeople = () => useState<PresencePerson[]>('presence-people', () => [])
const useEditing = () => useState<PresenceCell | null>('presence-editing', () => null)
// Что правят другие вкладки: вкладка → ячейка и когда о ней последний раз сообщили
const useRemoteEditing = () => useState<Record<string, { cell: PresenceCell, at: number }>>('presence-remote-editing', () => ({}))

export function usePresence() {
  const people = usePeople()
  const editing = useEditing()
  const remote = useRemoteEditing()
  const user = useHubUser()
  const self = computed<PresenceSelf>(() => ({ tab, name: user.value.name, email: user.value.email }))

  // Люди с тем, что они правят: своя вкладка — из своего состояния, чужие — из сообщений
  const withEditing = computed(() => people.value.map(person => ({
    ...person,
    editing: person.tab === tab ? editing.value : remote.value[person.tab]?.cell ?? null
  })))

  // Кто ещё в сервисе — для шапки
  const others = computed(() => presenceOthers(withEditing.value, self.value))
  // Сам человек, как его видят другие; пока вкладка не подключилась — null
  const me = computed(() => presenceSelf(withEditing.value, self.value))
  // Сколько человек в сервисе, включая себя
  const online = computed(() => presenceOnline(people.value, self.value))
  // Кто что правит: ключ → язык → имена — для меток на ячейках
  const editors = computed(() => presenceEditors(withEditing.value, self.value))

  // Что правит этот человек: ячейку грида, в шторке или в очереди; null — ничего
  const setEditing = (cell: PresenceCell | null) => {
    const same = cell && editing.value && cell.key === editing.value.key && cell.lang === editing.value.lang
    if (!same && (cell || editing.value)) editing.value = cell ? { key: cell.key, lang: cell.lang } : null
  }

  return { others, me, online, editors, setEditing }
}

/** Страница сообщает коллегам, какую ячейку правит (грид, шторка, очередь); ушли со страницы — ничего. */
export function usePresenceEditing(cell: () => PresenceCell | null) {
  const { setEditing } = usePresence()
  watchEffect(() => setEditing(cell()))
  onBeforeUnmount(() => setEditing(null))
}

/** Подключение — одно на вкладку, из лейаута: шлёт своё и принимает остальных, после обрыва подключается снова. */
export function usePresenceConnection() {
  const supabase = useSupabaseClient()
  const user = useHubUser()
  const people = usePeople()
  const editing = useEditing()
  const remote = useRemoteEditing()
  let subscribed = false
  let stopped = false
  let lastTrack = 0
  let attempts = 0
  let trackTimer: ReturnType<typeof setTimeout> | undefined
  let retryTimer: ReturnType<typeof setTimeout> | undefined
  let repeatTimer: ReturnType<typeof setInterval> | undefined

  // Телефон, планшет или компьютер — по экрану; поворот и смена окна пересчитывают
  const coarse = useMediaQuery('(pointer: coarse)')
  const { width, height } = useWindowSize()
  const device = computed(() => presenceDevice(coarse.value, width.value, height.value))

  // Присутствие — не чаще раза в TRACK_GAP; за паузу изменений может быть много, уйдёт последнее.
  // Без имени (не вошёл) человека не видно, но других он видит
  const track = () => {
    clearTimeout(trackTimer)
    if (!channel || !subscribed) return
    const wait = lastTrack + TRACK_GAP - Date.now()
    if (wait > 0) {
      trackTimer = setTimeout(track, wait)
      return
    }
    lastTrack = Date.now()
    if (user.value.name) channel.track({ name: user.value.name, email: user.value.email, since, device: device.value } satisfies PresenceMeta)
    else channel.untrack()
  }

  // Какую ячейку правлю — сразу, сообщением
  const sendEditing = () => {
    if (!channel || !subscribed || !user.value.name) return
    channel.send({ type: 'broadcast', event: 'editing', payload: { tab, editing: editing.value } })
  }

  const forget = (from: string) => {
    if (!remote.value[from]) return
    const { [from]: _, ...rest } = remote.value
    remote.value = rest
  }

  const connect = () => {
    const current = supabase.channel('hub-presence', { config: { presence: { key: tab } } })
    channel = current
    current
      .on('presence', { event: 'sync' }, () => {
        people.value = presencePeople(current.presenceState() as Record<string, unknown[]>)
        // Ушедшие вкладки — без меток. Свежую метку не трогаем: сообщение могло опередить присутствие новой вкладки
        const present = new Set(people.value.map(person => person.tab))
        const now = Date.now()
        for (const [from, entry] of Object.entries(remote.value)) if (!present.has(from) && now - entry.at > 3_000) forget(from)
      })
      .on('broadcast', { event: 'editing' }, ({ payload }) => {
        const from = (payload as { tab?: unknown })?.tab
        if (typeof from !== 'string' || from === tab) return
        const cell = presenceCell((payload as { editing?: unknown }).editing)
        if (cell) remote.value = { ...remote.value, [from]: { cell, at: Date.now() } }
        else forget(from)
      })
      // Новая вкладка спрашивает, кто что правит: отвечают те, кто правит
      .on('broadcast', { event: 'hello' }, () => {
        if (editing.value) sendEditing()
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          subscribed = true
          attempts = 0
          lastTrack = 0
          track()
          current.send({ type: 'broadcast', event: 'hello', payload: { tab } })
          if (editing.value) sendEditing()
          return
        }
        // Канал закрыли (обрыв, лимит сервера) — подключаемся снова, с паузой; иначе вкладка застыла бы
        if ((status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') && !stopped && channel === current) {
          subscribed = false
          channel = null
          supabase.removeChannel(current)
          clearTimeout(retryTimer)
          retryTimer = setTimeout(connect, RETRY[Math.min(attempts++, RETRY.length - 1)])
        }
      })
  }

  onMounted(() => {
    tab ||= globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)
    since ||= Date.now()
    connect()
    // Пока правлю — повторяю (сообщение могло потеряться); чужие метки без повторов — устарели
    repeatTimer = setInterval(() => {
      if (editing.value) sendEditing()
      const now = Date.now()
      for (const [from, entry] of Object.entries(remote.value)) if (now - entry.at > STALE) forget(from)
    }, REPEAT)
  })

  watch([() => user.value.name, () => user.value.email, device], track)
  watch(editing, sendEditing)

  onBeforeUnmount(() => {
    stopped = true
    clearTimeout(trackTimer)
    clearTimeout(retryTimer)
    clearInterval(repeatTimer)
    if (channel) supabase.removeChannel(channel)
    channel = null
    subscribed = false
    people.value = []
    remote.value = {}
  })
}
