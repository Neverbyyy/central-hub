<script setup lang="ts">
/**
 * Обёртка интерактива лендинга (Rive, позже GSAP): содержимое монтируется, только когда страница уже загружена,
 * первый экран отрисован и отвечает на нажатия — после load, паузы (delay, по умолчанию 2,5 с) и простоя браузера.
 * Интерактив — украшение: его рантайм и файлы (у Rive — wasm 2,6 МБ и .riv) не должны спорить с первым экраном
 * за сеть и процессор. С экономией трафика (Save-Data) и на сети 2G/3G не грузится вовсе.
 * Под обёрткой должна лежать картинка: она видна до интерактива и остаётся, если тот не загрузился или выключен.
 * Когда использовать: любой интерактив лендинга. Rive — DsRive внутри; GSAP — динамическим импортом внутри, когда понадобится.
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'

const props = withDefaults(defineProps<{
  // Пауза после загрузки страницы, мс
  delay?: number
}>(), {
  delay: 2500
})

const active = ref(false)
let cancel: (() => void) | undefined

interface NetworkInformationLike {
  saveData?: boolean
  effectiveType?: string
}

// Медленная сеть или экономия трафика — без интерактива: человек видит картинку
function lightOnly(): boolean {
  const connection = (navigator as Navigator & { connection?: NetworkInformationLike }).connection
  return !!connection && (connection.saveData === true || ['slow-2g', '2g', '3g'].includes(connection.effectiveType ?? ''))
}

onMounted(() => {
  if (lightOnly()) return
  const activate = () => {
    active.value = true
  }
  const whenIdle = () => {
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(activate, { timeout: 2000 })
      cancel = () => window.cancelIdleCallback(id)
    } else {
      // Safari без requestIdleCallback
      activate()
    }
  }
  const afterLoad = () => {
    const id = window.setTimeout(whenIdle, props.delay)
    cancel = () => window.clearTimeout(id)
  }
  if (document.readyState === 'complete') afterLoad()
  else {
    window.addEventListener('load', afterLoad, { once: true })
    cancel = () => window.removeEventListener('load', afterLoad)
  }
})
onBeforeUnmount(() => cancel?.())
</script>

<template>
  <slot v-if="active" />
</template>
