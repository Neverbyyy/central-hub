<script setup lang="ts">
/**
 * Круглая галочка «включено в подписку»: в углу карточек на обороте главной карточки Cars 2.
 * Цвета color.check.bg / color.check.icon, размер — spacing.icon-sm. Украшение: скринридер её пропускает,
 * смысл несёт текст карточки. Когда использовать: отметить, что карточка входит в покупку. Галочки списка — DsBenefitList.
 */
import DsIcon from './DsIcon.vue'
</script>

<template>
  <span
    class="ds:inline-flex ds:size-icon-sm ds:shrink-0 ds:items-center ds:justify-center ds:rounded-full ds:bg-check-bg ds:p-0.5 ds:text-check-icon"
    aria-hidden="true"
  >
    <DsIcon
      name="check"
      size="fill"
    />
  </span>
</template>
