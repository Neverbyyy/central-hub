<script setup lang="ts">
/**
 * Слайды по одному на экран с точками и автопрокруткой (левая половина пейволла Farm: «25+ Apps», «Play offline»…).
 * Содержимое слайда — слотом #slide с номером. Листается пальцем (нативная прокрутка со щелчком на слайд),
 * сам — раз в interval мс, только пока playing (экран открыт) и блок виден; пауза, пока палец на слайдах.
 * С prefers-reduced-motion сам не листает. Новое значение resetKey — сразу на первый слайд (повторное открытие экрана).
 * Событие change — номер показанного слайда (экран шлёт по нему аналитику).
 * Когда использовать: несколько равноправных слайдов. Ряд карточек разной ширины — DsCarousel.
 */
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useInView } from '../composables/useInView'
import DsDots from './DsDots.vue'

const props = withDefaults(defineProps<{
  count: number
  playing?: boolean
  interval?: number
  dots?: boolean
  // Точки поверх низа слайдов (на их фоне), а не под ними
  dotsOverlay?: boolean
  resetKey?: number | string
  // Подпись точки для скринридера: экран подставляет номер в ключ из сервиса
  dotLabel?: (index: number) => string
}>(), {
  playing: true,
  interval: 6000,
  dots: true,
  dotsOverlay: false,
  resetKey: undefined,
  dotLabel: undefined
})

const emit = defineEmits<{ change: [index: number] }>()

const track = ref<HTMLElement | null>(null)
const active = ref(0)
let timer: ReturnType<typeof setInterval> | undefined
let touching = false
let visible = true

const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

const goTo = (index: number, smooth = true) => {
  const el = track.value
  if (!el) return
  el.scrollTo({ left: index * el.clientWidth, behavior: smooth && !reducedMotion() ? 'smooth' : 'auto' })
}

const onScroll = () => {
  const el = track.value
  if (!el || !el.clientWidth) return
  const index = Math.round(el.scrollLeft / el.clientWidth)
  if (index !== active.value) {
    active.value = index
    emit('change', index)
  }
}

const stop = () => {
  clearInterval(timer)
  timer = undefined
}
const start = () => {
  stop()
  if (!props.playing || !visible || touching || props.count < 2 || reducedMotion()) return
  timer = setInterval(() => goTo((active.value + 1) % props.count), props.interval)
}

const onPointerDown = () => {
  touching = true
  stop()
}
const onPointerUp = () => {
  touching = false
  start()
}

watch(() => [props.playing, props.interval, props.count], start)
watch(() => props.resetKey, () => {
  goTo(0, false)
  start()
})

useInView(track, (inView) => {
  visible = inView
  start()
})

onMounted(start)
onBeforeUnmount(stop)

defineExpose({ goTo })
</script>

<template>
  <div class="ds:relative ds:flex ds:min-h-0 ds:flex-col">
    <div
      ref="track"
      class="ds-slides ds:flex ds:min-h-0 ds:flex-1 ds:overflow-x-auto ds:overflow-y-hidden"
      @scroll.passive="onScroll"
      @pointerdown="onPointerDown"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    >
      <div
        v-for="index in count"
        :key="index"
        class="ds-slides__slide ds:flex ds:w-full ds:shrink-0 ds:flex-col"
        :aria-hidden="index - 1 !== active || undefined"
      >
        <slot
          name="slide"
          :index="index - 1"
          :active="index - 1 === active"
        />
      </div>
    </div>

    <DsDots
      v-if="dots && count > 1"
      :class="dotsOverlay ? 'ds-slides__dots ds:absolute ds:inset-x-0' : 'ds:shrink-0'"
      :count="count"
      :active="active"
      :label="dotLabel"
      @select="goTo"
    />
  </div>
</template>

<style scoped>
/* Листание пальцем со щелчком на слайд; полоса прокрутки скрыта */
.ds-slides {
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  overscroll-behavior-x: contain;
}

.ds-slides::-webkit-scrollbar {
  display: none;
}

.ds-slides__slide {
  scroll-snap-align: start;
  scroll-snap-stop: always;
}

/* Слайды у нижнего края экрана: точки выше отступа. Только экран знает, где слайды, поэтому значение задаёт он */
.ds-slides__dots {
  bottom: var(--ds-slides-dots-bottom, 0px);
}
</style>
