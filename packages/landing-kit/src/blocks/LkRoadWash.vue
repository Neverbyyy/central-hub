<script setup lang="ts">
/**
 * Мини-автомойка: грязная машина, которую ребёнок моет пальцем (DsWipe) — пена, шум воды, а когда чисто, машина радостно
 * подпрыгивает. Интерактив не перекрывает значки сторов: это отдельный блок.
 * Вне экрана подсказка стоит, звук только после касания.
 * Когда использовать: лендинг с config.road. Цвета — color.lp.sign, color.lp.on-sign; размер — spacing.lp-road-truck-w.
 */
import { DsLink, DsWipe, useInView } from '@amaya/ui'
import { onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { playChime, startWater } from '../sound'
import { track } from '../track'
import { useLanding } from '../useLanding'
import LkBurst from './LkBurst.vue'

const { config, heroLoaded } = useLanding()
const { t } = useI18n()
const wash = config.road!.wash

// Пузырей на экране не больше десятка, новый — не чаще раза в 70 мс
const BUBBLES = 10
const BUBBLE_EVERY = 70

const root = ref<HTMLElement | null>(null)
const stage = ref<HTMLElement | null>(null)
const burst = ref<InstanceType<typeof LkBurst> | null>(null)
const round = ref(0)
const clean = ref(false)
const touched = ref(false)
const visible = ref(false)
const bubbles = ref<{ id: number, x: number, y: number }[]>([])

let nextBubble = 0
let lastBubble = 0
let stopWater: (() => void) | undefined

useInView(root, (inView) => {
  visible.value = inView
})

const onStart = () => {
  if (!touched.value) track('interactive_tap', { landing: config.id, target: 'wash' })
  touched.value = true
  stopWater?.()
  stopWater = startWater()
}

const onStop = () => {
  stopWater?.()
  stopWater = undefined
}

function onStroke(x: number, y: number) {
  const now = performance.now()
  if (now - lastBubble < BUBBLE_EVERY) return
  lastBubble = now
  bubbles.value = [...bubbles.value.slice(1 - BUBBLES), { id: ++nextBubble, x, y }]
}

const removeBubble = (id: number) => {
  bubbles.value = bubbles.value.filter(bubble => bubble.id !== id)
}

function onDone() {
  onStop()
  clean.value = true
  playChime()
  const box = stage.value?.getBoundingClientRect()
  if (box) burst.value?.fire(box.width / 2, box.height / 2)
  track('interactive_done', { landing: config.id, target: 'wash' })
}

function again() {
  clean.value = false
  round.value++
}

onBeforeUnmount(onStop)
</script>

<template>
  <section
    ref="root"
    class="ds:overflow-hidden ds:bg-lp-sign ds:px-6 ds:pb-10 ds:pt-10 ds:text-center"
    data-road-wash
  >
    <h2 class="ds:m-0 ds:font-display ds:text-lp-section-title ds:text-lp-on-sign ds:text-balance ds:wrap-break-word">
      {{ t(clean ? wash.cleanTitle : wash.title) }}
    </h2>
    <p
      class="ds:m-0 ds:mx-auto ds:mt-2 ds:max-w-lp-road-text-w ds:font-display ds:text-lp-lead ds:text-lp-on-sign ds:text-balance ds:wrap-break-word"
      aria-live="polite"
    >
      {{ t(clean ? wash.done : wash.text) }}
    </p>

    <div
      ref="stage"
      class="ds:relative ds:mx-auto ds:mt-6 ds:w-lp-road-truck-w ds:max-w-full ds:wide:w-lp-road-truck-w-wide"
      :class="clean ? 'lk-road-wash__truck--clean' : ''"
      :style="{ aspectRatio: wash.ratio }"
    >
      <span
        class="lk-road-wash__shadow ds:absolute ds:inset-x-0 ds:bottom-0"
        aria-hidden="true"
      />
      <DsWipe
        v-if="heroLoaded"
        :set="wash.art"
        :ratio="wash.ratio"
        :label="t(wash.label)"
        :reset-key="round"
        @start="onStart"
        @stroke="onStroke"
        @stop="onStop"
        @done="onDone"
      />
      <span
        v-if="!touched"
        class="lk-road-wash__hint ds:pointer-events-none ds:absolute ds:size-lp-road-bubble ds:rounded-pill ds:bg-lp-on-section"
        :class="visible ? '' : 'lk-road-wash__hint--paused'"
        aria-hidden="true"
      />
      <span
        v-for="bubble in bubbles"
        :key="bubble.id"
        class="lk-road-wash__bubble ds:pointer-events-none ds:absolute ds:size-lp-road-bubble ds:rounded-pill"
        :style="{ left: `${bubble.x * 100}%`, top: `${bubble.y * 100}%` }"
        aria-hidden="true"
        @animationend="removeBubble(bubble.id)"
      />
      <LkBurst ref="burst" />
    </div>

    <!-- Место под ссылку занято всегда: когда машина становится чистой, блок не вырастает -->
    <div
      class="ds:mt-3"
      :class="clean ? '' : 'ds:invisible'"
    >
      <DsLink
        class="ds:font-display ds:text-lp-hint ds:text-lp-on-sign"
        tone="inherit"
        @click="again"
      >
        {{ t(wash.again) }}
      </DsLink>
    </div>
  </section>
</template>

<style scoped>
.lk-road-wash__shadow {
  height: 12%;
  border-radius: 50%;
  background: var(--ds-color-lp-section);
  opacity: 0.25;
}

/* Подсказка: палец ходит по машине, пока её не коснулись */
.lk-road-wash__hint {
  left: 20%;
  top: 45%;
  opacity: 0.9;
  box-shadow: 0 0 0 0.5rem var(--ds-color-lp-on-section);
  animation: lk-road-wash-hint 1.5s var(--ds-ease-standard) infinite alternate;
}

.lk-road-wash__hint--paused {
  animation-play-state: paused;
}

@keyframes lk-road-wash-hint {
  to {
    transform: translateX(9rem);
  }
}

.lk-road-wash__bubble {
  margin: -0.875rem 0 0 -0.875rem;
  border: 2px solid var(--ds-color-lp-on-section);
  background: var(--ds-color-lp-on-section);
  opacity: 0.8;
  animation: lk-road-wash-bubble 0.8s var(--ds-ease-standard) forwards;
}

@keyframes lk-road-wash-bubble {
  to {
    opacity: 0;
    transform: translateY(-3.5rem) scale(1.5);
  }
}

.lk-road-wash__truck--clean {
  animation: lk-road-wash-hop 0.7s var(--ds-ease-standard);
}

@keyframes lk-road-wash-hop {
  30% {
    transform: translateY(-1.75rem) rotate(-3deg);
  }

  60% {
    transform: translateY(0) rotate(2deg);
  }

  80% {
    transform: translateY(-0.5rem);
  }
}

@media (prefers-reduced-motion: reduce) {
  .lk-road-wash__hint,
  .lk-road-wash__truck--clean {
    animation: none;
  }
}
</style>
