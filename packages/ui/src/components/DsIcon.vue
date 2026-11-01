<script setup lang="ts">
/**
 * Иконка из набора @amaya/icons. Цвет — цвет текста вокруг (currentColor), размер — токены spacing.icon-*.
 * Когда использовать: любая иконка. Без label — украшение (скринридер её пропускает), с label — значимая картинка.
 */
import { icons, type DsIconName } from '@amaya/icons'
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  name: DsIconName
  size?: 'sm' | 'md' | 'lg'
  label?: string
}>(), {
  size: 'md',
  label: undefined
})

const SIZE = { sm: 'ds:size-icon-sm', md: 'ds:size-icon-md', lg: 'ds:size-icon-lg' }

const shape = computed(() => icons[props.name] as { d: string, fill?: boolean })
</script>

<template>
  <svg
    viewBox="0 0 24 24"
    class="ds:inline-block ds:shrink-0"
    :class="SIZE[size]"
    :role="label ? 'img' : undefined"
    :aria-label="label"
    :aria-hidden="label ? undefined : 'true'"
    focusable="false"
  >
    <path
      v-if="shape.fill"
      :d="shape.d"
      fill="currentColor"
    />
    <path
      v-else
      :d="shape.d"
      fill="none"
      stroke="currentColor"
      stroke-width="2.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</template>
