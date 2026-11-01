<script setup lang="ts">
/**
 * Спиннер — вращение через transform. Цвет по умолчанию — цвет текста вокруг (в кнопке — цвет её текста).
 * Когда использовать: идёт покупка или загрузка (DsButton с loading показывает его сам). label — ключом из сервиса.
 */
withDefaults(defineProps<{
  size?: 'sm' | 'md' | 'lg'
  tone?: 'current' | 'accent' | 'inverse'
  label?: string
}>(), {
  size: 'md',
  tone: 'current',
  label: undefined
})

const SIZE = { sm: 'ds:size-icon-sm', md: 'ds:size-icon-md', lg: 'ds:size-icon-lg' }
const TONE = { current: '', accent: 'ds:text-accent', inverse: 'ds:text-text-inverse' }
</script>

<template>
  <span
    class="ds:inline-block ds:shrink-0 ds:animate-spin ds:rounded-full ds:border-2 ds:border-current ds:border-r-transparent"
    :class="[SIZE[size], TONE[tone]]"
    :role="label ? 'status' : undefined"
    :aria-label="label"
    :aria-hidden="label ? undefined : 'true'"
  />
</template>
