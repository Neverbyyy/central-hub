<script setup lang="ts">
/**
 * Текст с обводкой снаружи букв: игровой заголовок (DsGameTitle), надпись на кнопке Cars 2 (DsButton).
 * Цвет и толщина — CSS-значениями из токенов (например var(--ds-color-title-stroke), var(--ds-line-title)):
 * тема без обводки ставит толщину 0, и компонент выглядит как обычный текст.
 * Когда использовать: внутри своих компонентов дизайн-системы; на экране — DsGameTitle или DsButton.
 *
 * Два слоя одного текста: снизу копия с обводкой двойной толщины, сверху заливка — обводка получается снаружи букв,
 * как Outside stroke в Figma. Так работает во всех вебвью: paint-order для обычного текста старые Android
 * (Chrome до 123) не понимают, а SVG-текст приходится мерить по ширине. Переносы у слоёв совпадают — текст один.
 */
defineProps<{
  // CSS-цвет обводки
  color: string
  // CSS-толщина обводки снаружи букв
  width: string
}>()
</script>

<template>
  <span
    class="ds-outline"
    :style="{ '--ds-outline-color': color, '--ds-outline-width': width }"
  >
    <!-- Обводка: копия текста для глаз, скринридер читает только заливку -->
    <span
      class="ds-outline__stroke"
      aria-hidden="true"
    ><slot /></span>
    <span class="ds-outline__fill"><slot /></span>
  </span>
</template>

<style scoped>
.ds-outline {
  position: relative;
  display: inline-block;
}

.ds-outline__stroke {
  position: absolute;
  inset: 0;
  color: var(--ds-outline-color);
  /* Обводка рисуется по центру контура — вдвое толще, а половину закрывает заливка сверху */
  -webkit-text-stroke: calc(var(--ds-outline-width) * 2) var(--ds-outline-color);
  -webkit-user-select: none;
  user-select: none;
}

/* Выделенные слова в обводке — тем же цветом обводки */
.ds-outline__stroke :deep(em) {
  color: inherit;
}

.ds-outline__fill {
  position: relative;
}
</style>
