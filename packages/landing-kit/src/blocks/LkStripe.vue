<script setup lang="ts">
/**
 * Дорожная полоса между блоками: шевроны ограждения, клетки финиша или прерывистая разметка посреди асфальта.
 * Когда использовать: граница секций дорожного лендинга. Цвета — color.lp.sign, color.lp.section, высота spacing.lp-road-stripe-h.
 */
withDefaults(defineProps<{
  kind?: 'chevron' | 'checker' | 'dashes'
}>(), {
  kind: 'chevron'
})

const KIND = { chevron: 'ds:h-lp-road-stripe-h lk-stripe--chevron', checker: 'ds:h-lp-road-stripe-h lk-stripe--checker', dashes: 'lk-stripe--dashes' }
</script>

<template>
  <div
    class="ds:w-full"
    :class="KIND[kind]"
    aria-hidden="true"
  />
</template>

<style scoped>
.lk-stripe--chevron {
  background: repeating-linear-gradient(-45deg, var(--ds-color-lp-sign) 0 1rem, var(--ds-color-lp-section) 1rem 2rem);
}

.lk-stripe--dashes {
  height: 5rem;
  background: repeating-linear-gradient(180deg, var(--ds-color-lp-sign) 0 1.25rem, transparent 1.25rem 2.25rem) center / 0.375rem 100% no-repeat;
}

.lk-stripe--checker {
  background: repeating-conic-gradient(var(--ds-color-lp-on-section) 0 25%, var(--ds-color-lp-section) 0 50%) 0 0 / 1rem 1rem;
}
</style>
