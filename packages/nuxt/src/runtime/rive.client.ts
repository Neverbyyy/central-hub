// wasm Rive — со своего адреса: рантайм по умолчанию берёт его с unpkg, а без внешней сети анимация не загрузится.
// Сам рантайм качается, только когда на странице появился DsRive
import { configureRive } from '@amaya/ui'
import wasm from '@rive-app/webgl2/rive.wasm?url'
import wasmFallback from '@rive-app/webgl2/rive_fallback.wasm?url'
import { defineNuxtPlugin } from 'nuxt/app'

export default defineNuxtPlugin(() => {
  configureRive({ wasmUrl: wasm, wasmFallbackUrl: wasmFallback })
})
