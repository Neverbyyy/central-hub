<script setup lang="ts">
/**
 * Ряд карточек с прокруткой пальцем: наборы машин «Unlock for $5.99» справа от главной карточки Cars 2.
 * Карточки — слотом, промежуток между ними — полями (gap старые вебвью не знают). Прокрутка нативная,
 * со щелчком к началу карточки. hint — при каждом новом resetKey ряд показывается с середины и плавно
 * едет к началу: видно, что его можно листать (как в InApp). С prefers-reduced-motion — сразу в начале.
 * Когда использовать: карточки разной ширины в ряд. По одному слайду на экран с точками — DsSlides.
 */
import { nextTick, onMounted, ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  hint?: boolean
  resetKey?: number | string
}>(), {
  hint: false,
  resetKey: undefined
})

const track = ref<HTMLElement | null>(null)

const reset = async () => {
  await nextTick()
  const el = track.value
  if (!el) return
  const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!props.hint || reduced) {
    el.scrollTo({ left: 0, behavior: 'auto' })
    return
  }
  el.scrollTo({ left: Math.max(0, (el.scrollWidth - el.clientWidth) / 2), behavior: 'auto' })
  requestAnimationFrame(() => requestAnimationFrame(() => el.scrollTo({ left: 0, behavior: 'smooth' })))
}

watch(() => props.resetKey, reset)
onMounted(reset)
</script>

<template>
  <div
    ref="track"
    class="ds-carousel ds:flex ds:items-center ds:overflow-x-auto ds:overflow-y-hidden"
  >
    <slot />
  </div>
</template>

<style scoped>
.ds-carousel {
  scroll-snap-type: x proximity;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  overscroll-behavior-x: contain;
}

.ds-carousel::-webkit-scrollbar {
  display: none;
}

.ds-carousel > :deep(*) {
  flex-shrink: 0;
  scroll-snap-align: start;
}
</style>
