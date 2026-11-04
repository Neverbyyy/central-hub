<script setup lang="ts">
/**
 * Выбор тарифа: группа карточек DsPlanCard, выбран всегда один. Тарифы — массивом (тексты уже переведены экраном,
 * цены — из стора). Когда использовать: любой список тарифов на пейволле — 2, 3 или больше.
 *
 * Как радиокнопки: стрелки переводят выбор, Tab попадает только в выбранную карточку. Выбор — на касании карточки.
 * disabled — идёт покупка: карточки не нажимаются. Раскладка column — столбиком (Farm), row — в ряд (Cars 2).
 * Ряд может не поместиться (телефон в портрете): тогда он внутри DsCarousel, и карточка, которой коснулись, выезжает к центру.
 * Промежуток между карточками — полями, не gap (старые вебвью).
 */
import { nextTick, ref } from 'vue'
import type { DsPlan } from '../types'
import DsPlanCard from './DsPlanCard.vue'

const props = withDefaults(defineProps<{
  plans: DsPlan[]
  modelValue: number
  direction?: 'column' | 'row'
  layout?: 'split' | 'stack'
  indicator?: 'radio' | 'none'
  disabled?: boolean
  // Подпись группы для скринридера, ключом из сервиса
  label?: string
}>(), {
  direction: 'column',
  layout: 'split',
  indicator: 'none',
  disabled: false,
  label: undefined
})

const emit = defineEmits<{ 'update:modelValue': [index: number] }>()

const root = ref<HTMLElement | null>(null)

const card = (index: number) => root.value?.querySelectorAll<HTMLElement>('[role="radio"]')[index]

// Карточка выезжает к центру ряда, если он листается. Не scrollIntoView: на старых вебвью он не знает параметров
// и сдвигает ещё и попап вокруг ряда
const reveal = (index: number) => {
  const track = root.value?.closest<HTMLElement>('.ds-carousel')
  const box = card(index)?.getBoundingClientRect()
  if (!track || !box) return
  const view = track.getBoundingClientRect()
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  track.scrollTo({ left: track.scrollLeft + box.left + box.width / 2 - view.left - view.width / 2, behavior: reduced ? 'auto' : 'smooth' })
}

const select = (index: number) => {
  if (props.disabled) return
  if (index !== props.modelValue) emit('update:modelValue', index)
  reveal(index)
}

// Стрелки — как у группы радиокнопок: выбор переходит и фокус идёт за ним, по кругу
const onKeydown = async (event: KeyboardEvent) => {
  const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key]
  if (!step || props.disabled || !props.plans.length) return
  event.preventDefault()
  const next = (props.modelValue + step + props.plans.length) % props.plans.length
  select(next)
  await nextTick()
  card(next)?.focus({ preventScroll: true })
}
</script>

<template>
  <div
    ref="root"
    role="radiogroup"
    :aria-label="label"
    :aria-disabled="disabled || undefined"
    class="ds:flex"
    :class="direction === 'row' ? 'ds:flex-row ds:items-stretch ds:justify-center ds:space-x-2' : 'ds:flex-col ds:space-y-2'"
    @keydown="onKeydown"
  >
    <DsPlanCard
      v-for="(plan, index) in plans"
      :key="plan.key"
      :class="direction === 'row' ? 'ds:w-auto ds:flex-1' : ''"
      :selected="index === modelValue"
      :tabindex="index === modelValue ? 0 : -1"
      :title="plan.title"
      :subtitle="plan.subtitle"
      :price="plan.price"
      :period="plan.period"
      :note="plan.note"
      :badge="plan.badge"
      :tint="plan.tint"
      :emphasis="plan.emphasis"
      :layout="layout"
      :indicator="indicator"
      :disabled="disabled"
      :data-plan="plan.key"
      @select="select(index)"
    />
  </div>
</template>
