import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createStubEnv } from '../src/stub'
import { resolveSegment } from '../src/config'
import { createUniwebviewEnv, fromInAppData, toInAppData } from '../src/uniwebview'

// Вебвью без браузера: окружению InApp нужны только window.addEventListener и window.eventFn
beforeEach(() => {
  const target = new EventTarget()
  vi.stubGlobal('window', Object.assign(target, { parent: target }))
})
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fromInAppData', () => {
  it('продукты, триал и купленное — из AppData InApp', () => {
    const data = fromInAppData({
      locale: 'de',
      variant: 'ios_as_cars2_ds1_varb_t1_pw_slider_v1',
      wasTrial: true,
      productData: [{ Id: 'a', Price: '$1.99' }, { Id: 'b', Price: null }],
      purchases: { ActiveSubscriptions: [{ Product: { ProductId: 'sub' } }], NonConsumable: [{ Product: { ProductId: 'pack' } }] }
    })
    expect(data).toEqual({
      locale: 'de',
      variant: 'ios_as_cars2_ds1_varb_t1_pw_slider_v1',
      wasTrial: true,
      owned: ['sub', 'pack'],
      products: [{ id: 'a', price: '$1.99' }, { id: 'b', price: null }]
    })
  })

  it('без языка — английский, без покупок — пусто', () => {
    expect(fromInAppData({})).toEqual({ locale: 'en', variant: undefined, wasTrial: false, owned: [], products: [] })
  })
})

describe('toInAppData', () => {
  it('туда и обратно — те же данные: подписки в ActiveSubscriptions, наборы в NonConsumable', () => {
    const data = {
      locale: 'ru',
      variant: 'ios_as_farm_ds1_varb_ut1_pw_switch_v1',
      wasTrial: true,
      owned: ['com.amayasoft.cars2.weekly.trial3', 'com.amayasoft.cars2.zoo'],
      products: [{ id: 'com.amayasoft.farm.yearly.trial3.4999', price: '49,99 €' }, { id: 'gone', price: null }]
    }
    const raw = toInAppData(data)
    expect(raw.purchases?.ActiveSubscriptions).toEqual([{ Product: { ProductId: 'com.amayasoft.cars2.weekly.trial3' } }])
    expect(raw.purchases?.NonConsumable).toEqual([{ Product: { ProductId: 'com.amayasoft.cars2.zoo' } }])
    expect(fromInAppData(JSON.parse(JSON.stringify(raw)))).toEqual(data)
  })
})

describe('resolveSegment', () => {
  const segments = { t1: 'T1', u: 'U', wout1: 'WOUT1' }
  it('сегмент из имени варианта InApp', () => {
    expect(resolveSegment(segments, 'ios_as_cars2_ds1_varb_wout1_pw_slider_v1', 't1')).toBe('WOUT1')
    expect(resolveSegment(segments, 'ios_as_cars2_ds1_varb_u_pw_slider_v1', 't1')).toBe('U')
  })
  it('нет сегмента в имени — по умолчанию', () => {
    expect(resolveSegment(segments, 'ios_as_cars2_ds1_pw_slider_v1', 't1')).toBe('T1')
    expect(resolveSegment(segments, undefined, 't1')).toBe('T1')
  })
})

describe('createUniwebviewEnv — протокол InApp', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  const setup = () => {
    vi.useFakeTimers()
    const sent: string[] = []
    const env = createUniwebviewEnv({ legal: { terms: 'https://amayakids.com/terms.html', privacy: 'https://amayakids.com/privacy.html' }, send: url => sent.push(url) })
    const flush = async () => {
      for (let i = 0; i < 10; i++) await vi.advanceTimersByTimeAsync(1)
    }
    return { env, sent, flush }
  }

  it('команды экрана — адреса uniwebview://, как у InApp', async () => {
    const { env, sent, flush } = setup()
    env.ready()
    env.restore()
    env.openLegal('terms')
    env.track('inapp_scroll', { page_number: 1 })
    env.close()
    await flush()
    expect(sent).toEqual([
      'uniwebview://loaded?done=1',
      'uniwebview://ready',
      'uniwebview://restorePurchases',
      `uniwebview://openLink?url=${encodeURIComponent('https://amayakids.com/terms.html')}`,
      'uniwebview://mixpanelEventInappScroll?page_number=1',
      'uniwebview://close?method=1'
    ])
    env.dispose()
  })

  it('данные, open и итог покупки — через window.eventFn', async () => {
    const { env, sent, flush } = setup()
    const onData = vi.fn()
    const onOpen = vi.fn()
    env.on('data', onData)
    env.on('open', onOpen)
    const eventFn = (window as unknown as { eventFn: (e: string, d?: unknown) => void }).eventFn
    eventFn('data', JSON.stringify({ locale: 'ru', productData: [{ Id: 'x', Price: '$1' }] }))
    eventFn('open')
    expect(onData).toHaveBeenCalledWith(expect.objectContaining({ locale: 'ru' }))
    expect(onOpen).toHaveBeenCalled()

    const first = env.purchase('x')
    const second = env.purchase('x')
    await flush()
    expect(sent.filter(url => url.startsWith('uniwebview://buy'))).toEqual(['uniwebview://buy?Id=x'])
    eventFn('payment', 'success')
    await expect(first).resolves.toBe('success')
    await expect(second).resolves.toBe('success')

    const third = env.purchase('x')
    eventFn('payment', 'failed')
    await expect(third).resolves.toBe('error')
    env.dispose()
  })

  it('событие аналитики — base64 JSON в mixpanelEvent, кириллица не ломается', async () => {
    const { env, sent, flush } = setup()
    env.track('paywall_open', { title: 'Привет' })
    await flush()
    const url = sent.find(u => u.startsWith('uniwebview://mixpanelEvent?'))!
    const data = new URL(url.replace('uniwebview://', 'http://x/')).searchParams.get('data')!
    const json = new TextDecoder().decode(Uint8Array.from(atob(data), c => c.charCodeAt(0)))
    expect(JSON.parse(json)).toEqual({ eventName: 'paywall_open', additionalProperties: [{ key: 'title', value: 'Привет' }] })
    env.dispose()
  })
})

describe('createStubEnv', () => {
  it('лог вызовов и итог покупки из настроек', async () => {
    vi.useFakeTimers()
    const calls: string[] = []
    const env = createStubEnv({ data: { locale: 'en', products: [], wasTrial: false, owned: [] }, outcome: 'cancel', purchaseDelay: 100, onCall: c => calls.push(c.name) })
    env.ready()
    const result = env.purchase('x')
    await vi.advanceTimersByTimeAsync(100)
    await expect(result).resolves.toBe('cancel')
    expect(calls).toEqual(['ready', 'purchase'])
    vi.useRealTimers()
  })
})
