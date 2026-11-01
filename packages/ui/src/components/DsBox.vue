<script setup lang="ts">
/**
 * Блок — контейнер с внутренним отступом из шкалы 4 px и, по желанию, подложкой карточки из токенов.
 * Когда использовать: карточка, плашка, группа элементов с фоном. Для раскладки детей внутри — DsStack.
 */
import { computed } from 'vue'

type Padding = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8

const props = withDefaults(defineProps<{
  padding?: Padding
  // card — фон и радиус карточки темы (color.bg.card, radius.card)
  surface?: 'none' | 'card'
  as?: 'div' | 'section' | 'article' | 'li' | 'aside'
}>(), {
  padding: 0,
  surface: 'none',
  as: 'div'
})

const PADDING: Record<Padding, string> = { 0: '', 1: 'ds:p-1', 2: 'ds:p-2', 3: 'ds:p-3', 4: 'ds:p-4', 5: 'ds:p-5', 6: 'ds:p-6', 8: 'ds:p-8' }
const SURFACE = { none: '', card: 'ds:bg-bg-card ds:rounded-card' }

const classes = computed(() => [PADDING[props.padding], SURFACE[props.surface]])
</script>

<template>
  <component
    :is="as"
    :class="classes"
  >
    <slot />
  </component>
</template>
