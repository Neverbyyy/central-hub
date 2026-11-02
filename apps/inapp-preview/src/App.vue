<script setup lang="ts">
/**
 * Экран в вебвью — как InApp: окружение по протоколу uniwebview:// (данные, open, close, payment от приложения).
 * ?variant=<имя варианта> — какой экран. Без приложения (на телефоне по ссылке) — ?preset=<пресет>: данные пресета
 * подставляются сами, экран открывается, покупка «проходит» через 1,5 с. Полный эмулятор с панелью — этап 3.
 */
import { createStubEnv, createUniwebviewEnv, type PaywallEnv } from '@amaya/paywall-kit'
import { computed, onBeforeUnmount, shallowRef, watch, type Component } from 'vue'
import { useI18n } from 'vue-i18n'
import { findScreen, screens } from './variants'

const params = new URLSearchParams(location.search)
const variant = params.get('variant') ?? screens[0]!.id
const presetName = params.get('preset')
const screen = findScreen(variant)

const { locale } = useI18n()
const component = shallowRef<Component | null>(null)
const env = shallowRef<PaywallEnv | null>(null)
let dispose = () => {}
// Без приложения экран открываем сами — когда он смонтирован и подписан на события
let openStub = () => {}
const onScreenMounted = () => setTimeout(() => openStub(), 100)

if (screen) {
  screen.load().then((module) => {
    component.value = module.default
  })
  if (presetName) {
    // Без приложения: данные из пресета, экран сразу открыт
    screen.presets().then(({ presets }) => {
      const preset = presets[presetName] ?? presets.default!
      const stub = createStubEnv({ data: { ...preset.data, variant }, purchaseDelay: 1500, onCall: call => console.info('[экран →]', call.name, ...call.args) })
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
    const lang = current.data()?.locale
    if (lang) locale.value = lang
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
  <component
    :is="component!"
    v-if="ready"
    :env="env!"
    @vue:mounted="onScreenMounted"
  />
  <p
    v-else-if="!screen"
    style="padding: 16px; font: 14px/1.4 sans-serif"
  >
    Нет экрана для варианта «{{ variant }}». Есть: {{ screens.map(s => s.id).join(', ') }}
  </p>
</template>
