<script setup lang="ts">
/**
 * Плашка: «Best offer» на тарифе (accent — цвет color.badge.*, капс из темы case.badge) и цветные метки
 * «coloring pages», «puzzles» на карточке Cars 2 (green, red, purple, blue, yellow — color.tag.*).
 * Когда использовать: короткая пометка в одно-два слова. Текст — слотом, ключом из сервиса.
 */
withDefaults(defineProps<{
  tone?: 'accent' | 'green' | 'red' | 'purple' | 'blue' | 'yellow'
}>(), {
  tone: 'accent'
})

const TONE = {
  accent: 'ds:bg-badge-bg ds:text-badge-text ds:rounded-badge ds:px-2 ds:py-0.5 ds:case-badge',
  green: 'ds:bg-tag-green ds:text-tag-text ds:rounded-tag ds:px-1 ds:py-0.5',
  red: 'ds:bg-tag-red ds:text-tag-text ds:rounded-tag ds:px-1 ds:py-0.5',
  purple: 'ds:bg-tag-purple ds:text-tag-text ds:rounded-tag ds:px-1 ds:py-0.5',
  blue: 'ds:bg-tag-blue ds:text-tag-text ds:rounded-tag ds:px-1 ds:py-0.5',
  yellow: 'ds:bg-tag-yellow ds:text-tag-text ds:rounded-tag ds:px-1 ds:py-0.5'
}
</script>

<template>
  <span
    class="ds:inline-flex ds:items-center ds:whitespace-nowrap ds:font-body ds:text-badge"
    :class="TONE[tone]"
  >
    <slot />
  </span>
</template>
