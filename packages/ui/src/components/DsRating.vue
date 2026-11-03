<script setup lang="ts">
/**
 * Звёзды рейтинга: value из max (по умолчанию 5), целые — половинок в макетах нет. Цвет — color.lp.star,
 * размер звезды — spacing.lp-star; незаполненные — та же звезда бледнее.
 * Подпись для скринридера — снаружи, ключом из сервиса (ds.rating.aria.label с {rating}); сами звёзды — украшение.
 * Когда использовать: отзывы на лендинге.
 */
import DsIcon from './DsIcon.vue'

withDefaults(defineProps<{
  value: number
  max?: number
  // «Оценка 5 из 5» для скринридера
  label: string
}>(), {
  max: 5
})
</script>

<template>
  <span
    class="ds:inline-flex ds:items-center ds:space-x-1 ds:text-lp-star"
    role="img"
    :aria-label="label"
  >
    <span
      v-for="n in max"
      :key="n"
      class="ds:inline-flex ds:size-lp-star"
      :class="n <= Math.round(value) ? '' : 'ds:opacity-25'"
      :data-filled="n <= Math.round(value) ? '' : undefined"
    >
      <DsIcon
        name="star"
        size="fill"
      />
    </span>
  </span>
</template>
