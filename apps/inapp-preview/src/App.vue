<script setup lang="ts">
/**
 * Без ?variant — эмулятор InApp (панель, экран в iframe). С ?variant — сам экран в вебвью, как в InApp: окружение
 * по протоколу uniwebview:// (данные, open, close, payment от приложения или эмулятора). Без приложения (на телефоне
 * по ссылке) — ?preset=<пресет>[&lang=de]: данные пресета подставляются сами, экран открывается, покупка «проходит»
 * через 1,5 с. Закрылся — открыть его снова некому, поэтому поверх кнопка: экран откроется заново, как новый.
 */
import { createStubEnv, createUniwebviewEnv, type PaywallEnv } from '@amaya/paywall-kit'
import { computed, defineAsyncComponent, onBeforeUnmount, ref, shallowRef, watch, type Component } from 'vue'
import { useI18n } from 'vue-i18n'
import ScreenClosed from './emulator/ScreenClosed.vue'
import { findScreen, screens } from './variants'

const InAppEmulator = defineAsyncComponent(() => import('./emulator/InAppEmulator.vue'))

const params = new URLSearchParams(location.search)
const variant = params.get('variant')
const presetName = params.get('preset')
const lang = params.get('lang')
const screen = variant ? findScreen(variant) : undefined

const { locale } = useI18n()
const component = shallowRef<Component | null>(null)
const env = shallowRef<PaywallEnv | null>(null)
let dispose = () => {}
// Без приложения экран открываем сами — когда он смонтирован и подписан на события
let openStub = () => {}
const onScreenMounted = () => setTimeout(() => openStub(), 100)
const closed = ref(false)
const reopen = () => {
  closed.value = false
  openStub()
}

if (screen) {
  screen.load().then((module) => {
    component.value = module.default
  })
  if (presetName) {
    // Без приложения: данные из пресета, экран сразу открыт
    document.documentElement.classList.add('game-backdrop')
    screen.presets().then(({ presets }) => {
      const preset = presets[presetName] ?? presets.default!
      const data = { ...preset.data, variant: preset.data.variant ?? variant!, ...(lang ? { locale: lang } : {}) }
      const stub = createStubEnv({
        data,
        purchaseDelay: 1500,
        onCall: (call) => {
          console.info('[экран →]', call.name, ...call.args)
          if (call.name === 'close') closed.value = true
        }
      })
      env.value = stub
      openStub = () => stub.open()
    })
  } else {
    const real = createUniwebviewEnv({
      legal: { terms: 'https://amayakids.com/terms.html', privacy: 'https://amayakids.com/privacy.html' }
    })
    env.value = real
    dispose = real.dispose
  }
}

// Язык — из данных приложения, как в InApp
const unwatch = watch(env, (current) => {
  if (!current) return
  const apply = () => {
    const next = current.data()?.locale
    if (next) locale.value = next
  }
  apply()
  current.on('data', apply)
}, { immediate: true })

onBeforeUnmount(() => {
  unwatch()
  dispose()
})

const ready = computed(() => component.value && env.value)
</script>

<template>
  <InAppEmulator v-if="!variant" />
  <template v-else-if="ready">
    <component
      :is="component!"
      :env="env!"
      @vue:mounted="onScreenMounted"
    />
    <ScreenClosed
      v-if="closed"
      @open="reopen"
    />
  </template>
  <p
    v-else-if="!screen"
    style="padding: 16px; font: 14px/1.4 sans-serif"
  >
    Нет экрана для варианта «{{ variant }}». Есть: {{ screens.map(s => s.id).join(', ') }}
  </p>
</template>
