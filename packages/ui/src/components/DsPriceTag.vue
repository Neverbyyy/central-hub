<script setup lang="ts">
/**
 * Цена на плашке и строка под ней: «$0.96 / week» на светлой плашке, ниже «Just $49.99/year» (главная карточка Cars 2).
 * Когда использовать: крупная цена в шапке пейволла. Цены в карточках тарифов — DsPlanCard.
 * Тексты уже собраны экраном из ключей (цена подставлена). Цвета color.price.*, стиль текста text.body / text.price.
 */
withDefaults(defineProps<{
  // Строка на плашке
  price: string
  // Строка под плашкой
  sub?: string
}>(), {
  sub: undefined
})
</script>

<template>
  <span class="ds:inline-flex ds:flex-col ds:items-center ds:text-center">
    <span class="ds:rounded-pill ds:bg-price-bg ds:px-3 ds:py-1 ds:font-body ds:text-body ds:text-price-text">{{ price }}</span>
    <span
      v-if="sub"
      class="ds:mt-0.5 ds:font-body ds:text-price ds:text-price-sub"
    >{{ sub }}</span>
  </span>
</template>
