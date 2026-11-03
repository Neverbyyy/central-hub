// Сторона приложения в эмуляторе: то, что делает InApp вокруг вебвью (InApp-WebView-Hub, App.vue и useBridge).
// Экран → приложение: адреса uniwebview://<команда>?…; приложение → экран: события data, open, close, payment,
// hideProcessing. Последовательность как в InApp: loaded → приложение присылает data → экран отвечает ready →
// приложение открывает экран (open). Покупка: buy → итог payment. Всё пишется в лог, подозрительное помечается:
// дубли команд, второй buy до итога, ready без данных — то, что в InApp превращается в двойные покупки и события.
import type { PaywallData, PurchaseResult } from '@amaya/paywall-kit'
// Протокол без шаблонов .vue: этот модуль проверяется юнит-тестами без плагина Vue
import { toInAppData } from '@amaya/paywall-kit/uniwebview'

export interface Command {
  name: string
  params: Record<string, string>
  // mixpanelEvent: base64 JSON { eventName, additionalProperties: [{ key, value }] } — раскрытый
  event?: { name: string, props: Record<string, unknown> }
}

/** uniwebview://buy?Id=… → { name: 'buy', params: { Id } }; событие аналитики раскрывается из base64. */
export function parseCommand(url: string): Command {
  const [path = '', query = ''] = url.replace(/^uniwebview:\/\//, '').split('?')
  const params = Object.fromEntries(new URLSearchParams(query))
  const command: Command = { name: path, params }
  if (path === 'mixpanelEvent' && params.data) {
    try {
      const bytes = Uint8Array.from(atob(params.data), char => char.charCodeAt(0))
      const json = JSON.parse(new TextDecoder().decode(bytes)) as { eventName?: string, additionalProperties?: { key: string, value: unknown }[] }
      command.event = {
        name: json.eventName ?? '',
        props: Object.fromEntries((json.additionalProperties ?? []).map(({ key, value }) => [key, value]))
      }
    } catch {
      // Не base64 JSON — покажем как есть
    }
  }
  return command
}

/** Строка лога команды: «buy Id=com.amayasoft…», «mixpanelEvent paywall_open {"plan":"year"}». */
export function describeCommand(command: Command): string {
  if (command.event) {
    const props = Object.keys(command.event.props).length ? ` ${JSON.stringify(command.event.props)}` : ''
    return `${command.name} ${command.event.name}${props}`
  }
  const params = Object.entries(command.params).map(([key, value]) => `${key}=${value}`).join(' ')
  return params ? `${command.name} ${params}` : command.name
}

// Итог покупки из панели; none — приложение убрало загрузку без итога (hideProcessing)
export type PayResult = PurchaseResult | 'none'

export interface LogEntry {
  id: number
  // мс от загрузки экрана
  at: number
  // in — экран → приложение, out — приложение → экран
  dir: 'in' | 'out'
  text: string
  // Что-то не так: дубль, второй buy, ready без данных
  problem?: string
  // Пояснение без ошибки: «экран не показан — нет продукта»
  note?: string
}

export type Phase = 'loading' | 'loaded' | 'data' | 'ready' | 'open' | 'closed'

export interface HostState {
  phase: Phase
  // Идёт покупка: ID продукта
  purchasing: string | null
  // Сколько прошло от отправки данных до ready, мс
  readyIn: number | null
  // Экран показывался в этой сессии (после data был ready)
  shown: boolean
}

export interface HostOptions {
  // Отправить событие экрану (postMessage { eventName, data })
  send: (eventName: string, data?: unknown) => void
  // Новая запись лога и новое состояние
  onChange: (log: LogEntry[], state: HostState) => void
  // Открывать экран сразу после ready, как приложение
  autoOpen: () => boolean
  // Итог покупки без кнопки (через delay мс); null — ждать кнопку
  autoPay: () => PayResult | null
  payDelay?: number
  now?: () => number
}

// Одинаковые команды ближе этого — дубль (двойной тап, двойная подписка на событие)
const DUPLICATE_MS = 600

export function createHost(options: HostOptions) {
  const now = options.now ?? (() => performance.now())
  let started = now()
  let log: LogEntry[] = []
  let nextId = 1
  let state: HostState = { phase: 'loading', purchasing: null, readyIn: null, shown: false }
  let dataAt: number | null = null
  let readyForData = false
  let data: PaywallData | null = null
  let payTimer: ReturnType<typeof setTimeout> | undefined
  const lastSeen = new Map<string, number>()

  const emit = () => options.onChange(log, state)
  const write = (entry: Omit<LogEntry, 'id' | 'at'>) => {
    log = [...log, { id: nextId++, at: Math.round(now() - started), ...entry }]
  }
  const set = (patch: Partial<HostState>) => {
    state = { ...state, ...patch }
  }

  const out = (eventName: string, payload?: unknown, text = eventName) => {
    options.send(eventName, payload)
    write({ dir: 'out', text })
  }

  function sendData(next: PaywallData) {
    data = next
    dataAt = now()
    readyForData = false
    set({ phase: state.phase === 'open' ? 'open' : 'data', readyIn: null })
    // Как InApp: AppData строкой JSON (eventFn('data', JSON.stringify(…)))
    out('data', JSON.stringify(toInAppData(next)), `data ${next.locale}, продуктов ${next.products.filter(p => p.price).length}, триал ${next.wasTrial ? 'был' : 'не был'}${next.owned.length ? `, куплено ${next.owned.length}` : ''}`)
    emit()
  }

  function open() {
    out('open')
    set({ phase: 'open' })
    emit()
  }

  function close() {
    out('close')
    set({ phase: 'closed', purchasing: null })
    clearTimeout(payTimer)
    emit()
  }

  function pay(result: PayResult) {
    clearTimeout(payTimer)
    if (result === 'none') out('hideProcessing')
    else out('payment', result, `payment ${result}`)
    set({ purchasing: null })
    emit()
  }

  /** Команда экрана. */
  function receive(url: string) {
    const command = parseCommand(url)
    const text = describeCommand(command)
    const at = now()
    let problem: string | undefined
    let note: string | undefined

    const previous = lastSeen.get(url)
    lastSeen.set(url, at)
    if (previous !== undefined && at - previous < DUPLICATE_MS && command.name !== 'mixpanelEventInappScroll') {
      problem = `дубль: та же команда через ${Math.round(at - previous)} мс`
    }

    switch (command.name) {
      case 'loaded':
        set({ phase: 'loaded' })
        break
      case 'ready':
        if (dataAt === null) problem = 'ready до данных: экран не знает цен и языка'
        else if (readyForData) problem ??= 'повторный ready на те же данные'
        else set({ readyIn: Math.round(at - dataAt) })
        readyForData = true
        set({ shown: true, phase: state.phase === 'open' ? 'open' : 'ready' })
        break
      case 'close':
        if (state.phase === 'closed') problem ??= 'close, а экран уже закрыт'
        if (!readyForData && dataAt !== null) note = 'экран не показан: закрылся без ready (нет продукта)'
        clearTimeout(payTimer)
        set({ phase: 'closed', purchasing: null })
        break
      case 'buy':
        if (state.purchasing) problem ??= `второй buy, пока идёт покупка ${state.purchasing}`
        else if (state.phase !== 'open') problem ??= 'buy, а экран не открыт'
        set({ purchasing: command.params.Id ?? '?' })
        break
    }

    write({ dir: 'in', text, problem, note })
    emit()

    // Ответы приложения
    if (command.name === 'loaded' && data) sendData(data)
    if (command.name === 'ready' && !problem && state.phase !== 'open' && options.autoOpen()) open()
    if (command.name === 'buy' && !problem) {
      const result = options.autoPay()
      if (result) payTimer = setTimeout(() => pay(result), options.payDelay ?? 1500)
    }
  }

  /** Новый экран (перезагрузка вебвью): лог и состояние с нуля, данные — те же. */
  function reset(next: PaywallData) {
    clearTimeout(payTimer)
    started = now()
    log = []
    lastSeen.clear()
    dataAt = null
    readyForData = false
    data = next
    state = { phase: 'loading', purchasing: null, readyIn: null, shown: false }
    emit()
  }

  return {
    receive,
    sendData,
    open,
    close,
    pay,
    reset,
    get log() {
      return log
    },
    get state() {
      return state
    }
  }
}

export type Host = ReturnType<typeof createHost>
