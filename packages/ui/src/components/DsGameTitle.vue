<script setup lang="ts">
/**
 * Игровой заголовок с обводкой вокруг букв (цвета color.title.fill / color.title.stroke, толщина title.stroke-width).
 * Когда использовать: крупный заголовок пейволла или лендинга в стиле игры. Обычный заголовок — DsText.
 *
 * Два слоя одного текста: снизу копия с обводкой двойной толщины, сверху заливка — обводка получается снаружи букв.
 * Так работает во всех вебвью: paint-order для обычного текста старые Android (Chrome до 123) не понимают,
 * а SVG-текст приходится мерить по ширине. Переносы у слоёв совпадают — текст один и тот же.
 */
withDefaults(defineProps<{
  variant?: 'title-lg' | 'title-md'
  align?: 'start' | 'center' | 'end'
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'div'
}>(), {
  variant: 'title-lg',
  align: 'center',
  as: 'h1'
})

const VARIANT = { 'title-lg': 'ds:text-title-lg', 'title-md': 'ds:text-title-md' }
const ALIGN = { start: 'ds:text-start', center: 'ds:text-center', end: 'ds:text-end' }
</script>

<template>
  <component
    :is="as"
    class="ds-game-title ds:relative ds:font-title"
    :class="[VARIANT[variant], ALIGN[align]]"
  >
    <!-- Обводка: копия текста для глаз, скринридер читает только заливку -->
    <span
      class="ds-game-title__stroke"
      aria-hidden="true"
    ><slot /></span>
    <span class="ds-game-title__fill"><slot /></span>
  </component>
</template>

<style scoped>
.ds-game-title__stroke {
  position: absolute;
  inset: 0;
  color: var(--ds-color-title-stroke);
  /* Обводка рисуется по центру контура — вдвое толще, а половину закрывает заливка сверху */
  -webkit-text-stroke: calc(var(--ds-title-stroke-width) * 2) var(--ds-color-title-stroke);
  -webkit-user-select: none;
  user-select: none;
}

.ds-game-title__fill {
  position: relative;
  color: var(--ds-color-title-fill);
}
</style>
