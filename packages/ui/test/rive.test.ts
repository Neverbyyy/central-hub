import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Загрузчик рантайма Rive: wasm со своего адреса, один рантайм на приложение, повтор после сбоя сети, UMD-сборка
const runtime = vi.hoisted(() => ({ RuntimeLoader: { setWasmUrl: vi.fn(), setWasmFallbackUrl: vi.fn() } }))

// У каждого теста свой модуль: загрузчик хранит рантайм в модуле
const fresh = () => import('../src/rive')

describe('рантайм Rive', () => {
  beforeEach(() => {
    vi.resetModules()
    runtime.RuntimeLoader.setWasmUrl.mockClear()
    runtime.RuntimeLoader.setWasmFallbackUrl.mockClear()
    vi.doMock('@rive-app/webgl2', () => runtime)
  })
  afterEach(() => {
    vi.doUnmock('@rive-app/webgl2')
  })

  it('wasm — с адреса приложения, рантайм один на все анимации', async () => {
    const { configureRive, loadRive } = await fresh()
    configureRive({ wasmUrl: '/assets/rive.wasm', wasmFallbackUrl: null })
    const first = await loadRive()
    const second = await loadRive()
    expect(second).toBe(first)
    expect(runtime.RuntimeLoader.setWasmUrl).toHaveBeenCalledTimes(1)
    expect(runtime.RuntimeLoader.setWasmUrl).toHaveBeenCalledWith('/assets/rive.wasm')
    expect(runtime.RuntimeLoader.setWasmFallbackUrl).toHaveBeenCalledWith(null)
  })

  it('без configureRive адреса рантайма не трогаются', async () => {
    const { loadRive } = await fresh()
    await loadRive()
    expect(runtime.RuntimeLoader.setWasmUrl).not.toHaveBeenCalled()
    expect(runtime.RuntimeLoader.setWasmFallbackUrl).not.toHaveBeenCalled()
  })

  it('UMD-сборка в default — рантайм достаётся из него', async () => {
    vi.doMock('@rive-app/webgl2', () => ({ default: runtime }))
    const { loadRive } = await fresh()
    expect((await loadRive()).RuntimeLoader).toBe(runtime.RuntimeLoader)
  })

  it('не загрузился — следующий вызов пробует снова', async () => {
    vi.doMock('@rive-app/webgl2', () => {
      throw new Error('нет сети')
    })
    const { loadRive } = await fresh()
    await expect(loadRive()).rejects.toThrow()
    vi.doMock('@rive-app/webgl2', () => runtime)
    await expect(loadRive()).resolves.toBeDefined()
  })
})
