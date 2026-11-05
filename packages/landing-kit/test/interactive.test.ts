import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isSoftwareRenderer } from '../src/interactive'

describe('isSoftwareRenderer', () => {
  it.each([
    'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)',
    'Google SwiftShader',
    'llvmpipe (LLVM 15.0.7, 256 bits)',
    'softpipe',
    'ANGLE (Microsoft, Microsoft Basic Render Driver Direct3D11 vs_5_0 ps_5_0, D3D11)',
    'Software Adapter'
  ])('%s — программный', (renderer) => {
    expect(isSoftwareRenderer(renderer)).toBe(true)
  })

  it.each([
    'ANGLE (NVIDIA, NVIDIA GeForce RTX 3050 (0x00002507) Direct3D11 vs_5_0 ps_5_0, D3D11)',
    'ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0, D3D11)',
    'Apple GPU',
    'Adreno (TM) 618',
    'Mali-G57',
    'WebKit WebGL'
  ])('%s — видеокарта', (renderer) => {
    expect(isSoftwareRenderer(renderer)).toBe(false)
  })
})

describe('watchFrameRate', () => {
  let frame: ((now: number) => void) | undefined
  let onVisibility: (() => void) | undefined

  // Модуль помнит, что замер был: на каждый тест — свежий
  const load = async () => {
    vi.resetModules()
    return await import('../src/interactive')
  }

  const step = (now: number) => {
    const next = frame!
    frame = undefined
    next(now)
  }

  // Кадры с нужной частотой, пока замер просит следующий
  const run = (fps: number, from = 0) => {
    for (let now = from; frame; now += 1000 / fps) step(now)
  }

  // Кадры с нужной частотой в течение ms; вернёт время следующего кадра
  const runFor = (fps: number, from: number, ms: number) => {
    let now = from
    for (; now < from + ms && frame; now += 1000 / fps) step(now)
    return now
  }

  beforeEach(() => {
    frame = undefined
    onVisibility = undefined
    vi.stubGlobal('requestAnimationFrame', (callback: (now: number) => void) => {
      frame = callback
      return 1
    })
    vi.stubGlobal('document', {
      addEventListener: (_: string, listener: () => void) => {
        onVisibility = listener
      },
      removeEventListener: () => {
        onVisibility = undefined
      }
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('60 кадров — анимация остаётся', async () => {
    const { interactiveOff, watchFrameRate } = await load()
    watchFrameRate()
    run(60)
    expect(interactiveOff.value).toBe(false)
  })

  it('30 кадров — анимация остаётся: так iPhone работает в энергосбережении', async () => {
    const { interactiveOff, watchFrameRate } = await load()
    watchFrameRate()
    run(30)
    expect(interactiveOff.value).toBe(false)
  })

  it('10 кадров — анимация снимается', async () => {
    const { interactiveOff, watchFrameRate } = await load()
    watchFrameRate()
    run(10)
    expect(interactiveOff.value).toBe(true)
  })

  it('провал на старте не снимает: так стартует Rive и на хорошей видеокарте', async () => {
    const { interactiveOff, watchFrameRate } = await load()
    watchFrameRate()
    // Прогрев 1 с и ещё 2 с медленно, потом 60 кадров — как в Opera на RTX 3050
    const now = runFor(15, 0, 3000)
    run(60, now)
    expect(interactiveOff.value).toBe(false)
  })

  it('провалы вразброс не снимают: нужны три секунды подряд', async () => {
    const { interactiveOff, watchFrameRate } = await load()
    watchFrameRate()
    let now = runFor(60, 0, 1000)
    for (const fps of [15, 15, 60, 15, 15, 60]) now = runFor(fps, now, 1000)
    run(60, now)
    expect(interactiveOff.value).toBe(false)
  })

  it('медленно три секунды подряд — снимает, не дожидаясь конца замера', async () => {
    const { interactiveOff, watchFrameRate } = await load()
    watchFrameRate()
    runFor(10, 0, 4300)
    expect(interactiveOff.value).toBe(true)
    expect(frame).toBeUndefined()
  })

  it('заканчивается сам: новых кадров не просит и за вкладкой не следит', async () => {
    const { watchFrameRate } = await load()
    watchFrameRate()
    run(60)
    expect(frame).toBeUndefined()
    expect(onVisibility).toBeUndefined()
  })

  it('разрыв из-за скрытой вкладки не считается тормозами', async () => {
    const { interactiveOff, watchFrameRate } = await load()
    watchFrameRate()
    // Прогрев прошёл, окно замера открыто
    for (let now = 0; now < 1000; now += 16) step(now)
    // Вкладку скрыли на минуту: кадров не было. Без сброса окна вышло бы меньше кадра в секунду
    onVisibility!()
    run(60, 61000)
    expect(interactiveOff.value).toBe(false)
  })

  it('второй вызов замер не запускает', async () => {
    const { watchFrameRate } = await load()
    watchFrameRate()
    frame = undefined
    watchFrameRate()
    expect(frame).toBeUndefined()
  })
})
