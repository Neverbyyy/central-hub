<script setup lang="ts">
/**
 * Список преимуществ: «25+ apps», «Play offline», «No ads». Маркер — точка (Farm) или галочка (Cars 2),
 * цвет маркера color.bullet, текст — стиль text.list. Когда использовать: 2–4 коротких преимущества на пейволле.
 * Тексты — массивом, уже переведённые экраном (ключи из сервиса).
 */
import DsIcon from './DsIcon.vue'

withDefaults(defineProps<{
  items: string[]
  marker?: 'dot' | 'check'
  tone?: 'primary' | 'secondary'
}>(), {
  marker: 'dot',
  tone: 'secondary'
})
</script>

<template>
  <ul
    class="ds:flex ds:flex-col ds:space-y-1 ds:font-body ds:text-list"
    :class="tone === 'primary' ? 'ds:text-text-primary' : 'ds:text-text-secondary'"
  >
    <li
      v-for="(item, index) in items"
      :key="index"
      class="ds:flex ds:items-start"
    >
      <!-- Маркер ростом в строку текста: 1lh, а где lh не понимают — 1em -->
      <span class="ds-benefit__marker ds:me-1 ds:inline-flex ds:shrink-0 ds:items-center ds:justify-center ds:text-bullet">
        <DsIcon
          :name="marker"
          size="fill"
        />
      </span>
      <span class="ds:min-w-0">{{ item }}</span>
    </li>
  </ul>
</template>

<style scoped>
.ds-benefit__marker {
  width: 1.2em;
  height: 1em;
  height: 1lh;
}
</style>
