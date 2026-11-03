// Сторона приложения в эмуляторе InApp: разбор команд экрана и подозрительное в логе
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHost, describeCommand, parseCommand, type PayResult } from '../../apps/inapp-preview/src/emulator/inapp'

const DATA = {
  locale: 'en',
  variant: 'ios_as_cars2_ds1_varb_t1_pw_slider_v1',
  wasTrial: false,
  owned: [],
  products: [{ id: 'year', price: '$39.99' }]
}

// base64 через UTF-8 — так кодирует экран (uniwebview.ts)
const base64 = (value: unknown) => {
  let binary = ''
  for (const byte of new TextEncoder().encode(JSON.stringify(value))) binary += String.fromCharCode(byte)
  return btoa(binary)
}

describe('parseCommand', () => {
  it('команда и параметры', () => {
    expect(parseCommand('uniwebview://buy?Id=com.amayasoft.cars2.yearly')).toEqual({ name: 'buy', params: { Id: 'com.amayasoft.cars2.yearly' } })
    expect(describeCommand(parseCommand('uniwebview://close?method=1'))).toBe('close method=1')
  })

  it('событие аналитики раскрывается из base64, кириллица на месте', () => {
    const data = base64({ eventName: 'paywall_open', additionalProperties: [{ key: 'plan', value: 'год' }] })
    const command = parseCommand(`uniwebview://mixpanelEvent?data=${encodeURIComponent(data)}`)
    expect(command.event).toEqual({ name: 'paywall_open', props: { plan: 'год' } })
    expect(describeCommand(command)).toBe('mixpanelEvent paywall_open {"plan":"год"}')
  })
})

describe('createHost — как InApp', () => {
  let time = 0
  let sent: { eventName: string, data?: unknown }[]
  let autoPay: PayResult | null
  const host = () => createHost({
    send: (eventName, data) => sent.push({ eventName, data }),
    onChange: () => {},
    autoOpen: () => true,
    autoPay: () => autoPay,
    payDelay: 100,
    now: () => time
  })

  beforeEach(() => {
    time = 0
    sent = []
    autoPay = null
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('loaded → данные AppData строкой, ready → open, время до «готов»', () => {
    const app = host()
    app.reset(DATA)
    app.receive('uniwebview://loaded?done=1')
    expect(sent[0]?.eventName).toBe('data')
    expect(JSON.parse(sent[0]!.data as string)).toMatchObject({ locale: 'en', productData: [{ Id: 'year', Price: '$39.99' }] })
    time = 240
    app.receive('uniwebview://ready')
    expect(sent.map(item => item.eventName)).toEqual(['data', 'open'])
    expect(app.state).toMatchObject({ phase: 'open', readyIn: 240, shown: true })
    expect(app.log.filter(item => item.problem)).toEqual([])
  })

  it('двойной тап: второй buy до итога и дубль — помечены', () => {
    const app = host()
    app.reset(DATA)
    app.receive('uniwebview://loaded?done=1')
    app.receive('uniwebview://ready')
    app.receive('uniwebview://buy?Id=year')
    time = 50
    app.receive('uniwebview://buy?Id=year')
    expect(app.log.at(-1)?.problem).toMatch(/дубль/)
    expect(app.state.purchasing).toBe('year')
  })

  it('итог покупки: кнопкой или сам через задержку', () => {
    const app = host()
    app.reset(DATA)
    app.receive('uniwebview://loaded?done=1')
    app.receive('uniwebview://ready')
    app.receive('uniwebview://buy?Id=year')
    app.pay('cancel')
    expect(sent.at(-1)).toEqual({ eventName: 'payment', data: 'cancel' })
    expect(app.state.purchasing).toBeNull()

    autoPay = 'success'
    time = 5000
    app.receive('uniwebview://buy?Id=year')
    vi.advanceTimersByTime(100)
    expect(sent.at(-1)).toEqual({ eventName: 'payment', data: 'success' })
  })

  it('нет продукта: close без ready — не ошибка, а пояснение; ready до данных и повторный ready — ошибки', () => {
    const app = host()
    app.reset(DATA)
    app.receive('uniwebview://loaded?done=1')
    app.receive('uniwebview://close?method=1')
    expect(app.log.at(-1)).toMatchObject({ note: expect.stringMatching(/не показан/) })
    expect(app.log.at(-1)?.problem).toBeUndefined()

    const early = host()
    early.reset(DATA)
    early.receive('uniwebview://ready')
    expect(early.log.at(-1)?.problem).toMatch(/до данных/)

    const twice = host()
    twice.reset(DATA)
    twice.receive('uniwebview://loaded?done=1')
    twice.receive('uniwebview://ready')
    time = 1000
    twice.receive('uniwebview://ready')
    expect(twice.log.at(-1)?.problem).toMatch(/повторный ready/)
  })
})
