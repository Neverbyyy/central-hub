// Рантайм Rive (@rive-app/webgl2, как в InApp): один на приложение, грузится динамическим импортом, только когда
// к экрану подъехал первый DsRive. Рантайм — peer-зависимость: в InApp берётся его собственный, вместе с уже прогретым wasm.
// wasm (2,6 МБ) рантайм по умолчанию берёт с unpkg — приложение отдаёт его со своего адреса через configureRive
import type { Rive } from '@rive-app/webgl2'

export type RiveRuntime = typeof import('@rive-app/webgl2')
export type RiveInstance = Rive

export interface RiveOptions {
  /** Адрес rive.wasm: `import wasm from '@rive-app/webgl2/rive.wasm?url'`. Без него — unpkg. */
  wasmUrl?: string
  /** Запасной wasm для старых устройств (`rive_fallback.wasm`); null — без запасного. Без него — jsdelivr. */
  wasmFallbackUrl?: string | null
}

let options: RiveOptions = {}
let runtime: Promise<RiveRuntime> | undefined

/** Откуда брать wasm. Один раз при старте приложения, до первого DsRive. */
export function configureRive(next: RiveOptions): void {
  options = next
}

/** Рантайм Rive. Не загрузился (нет сети) — следующий вызов пробует снова. */
export function loadRive(): Promise<RiveRuntime> {
  if (!runtime) {
    runtime = import('@rive-app/webgl2').then((imported) => {
      // Рантайм — UMD-сборка: у сборщика он приходит или сам, или в default
      const module = ('RuntimeLoader' in imported ? imported : (imported as unknown as { default: RiveRuntime }).default)
      if (options.wasmUrl) module.RuntimeLoader.setWasmUrl(options.wasmUrl)
      if (options.wasmFallbackUrl !== undefined) module.RuntimeLoader.setWasmFallbackUrl(options.wasmFallbackUrl)
      return module
    }, (error: unknown) => {
      runtime = undefined
      throw error
    })
  }
  return runtime
}
