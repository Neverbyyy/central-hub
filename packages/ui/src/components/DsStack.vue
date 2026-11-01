<script setup lang="ts">
/**
 * Стек — колонка или строка с отступом между детьми из шкалы 4 px (gap 4 = 16 px).
 * Когда использовать: любая раскладка «друг под другом» или «в ряд» внутри экрана.
 * Отступ — margin (ds:space-*), а не gap: старые вебвью gap у flex не понимают (конвенции InApp).
 */
import { computed } from 'vue'

type Gap = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12

const props = withDefaults(defineProps<{
  direction?: 'vertical' | 'horizontal'
  gap?: Gap
  // stretch по умолчанию: center сжимает детей по ширине (грабли InApp с клиентской шириной)
  align?: 'stretch' | 'start' | 'center' | 'end'
  justify?: 'start' | 'center' | 'end' | 'between'
  as?: 'div' | 'section' | 'ul' | 'ol' | 'nav' | 'footer' | 'header'
}>(), {
  direction: 'vertical',
  gap: 0,
  align: 'stretch',
  justify: 'start',
  as: 'div'
})

// Полные имена классов — иначе Tailwind их не увидит
const GAP_Y: Record<Gap, string> = { 0: '', 1: 'ds:space-y-1', 2: 'ds:space-y-2', 3: 'ds:space-y-3', 4: 'ds:space-y-4', 5: 'ds:space-y-5', 6: 'ds:space-y-6', 8: 'ds:space-y-8', 10: 'ds:space-y-10', 12: 'ds:space-y-12' }
const GAP_X: Record<Gap, string> = { 0: '', 1: 'ds:space-x-1', 2: 'ds:space-x-2', 3: 'ds:space-x-3', 4: 'ds:space-x-4', 5: 'ds:space-x-5', 6: 'ds:space-x-6', 8: 'ds:space-x-8', 10: 'ds:space-x-10', 12: 'ds:space-x-12' }
const ALIGN = { stretch: 'ds:items-stretch', start: 'ds:items-start', center: 'ds:items-center', end: 'ds:items-end' }
const JUSTIFY = { start: 'ds:justify-start', center: 'ds:justify-center', end: 'ds:justify-end', between: 'ds:justify-between' }

const classes = computed(() => [
  'ds:flex',
  props.direction === 'horizontal' ? 'ds:flex-row' : 'ds:flex-col',
  props.direction === 'horizontal' ? GAP_X[props.gap] : GAP_Y[props.gap],
  ALIGN[props.align],
  JUSTIFY[props.justify]
])
</script>

<template>
  <component
    :is="as"
    :class="classes"
  >
    <slot />
  </component>
</template>
