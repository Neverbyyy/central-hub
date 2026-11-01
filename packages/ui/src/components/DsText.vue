<script setup lang="ts">
/**
 * Текст в стиле токенов: размер сам меняется на 844 и 1024 px, заголовки — шрифтом заголовков темы.
 * Когда использовать: любой текст на экране. Сам текст приходит снаружи (слот) — ключом из сервиса, компонент не переводит.
 * Игровой заголовок с обводкой — DsGameTitle.
 */
import { computed } from 'vue'
import type { DsTextTone, DsTextVariant } from '../types'

const props = withDefaults(defineProps<{
  variant?: DsTextVariant
  tone?: DsTextTone
  align?: 'start' | 'center' | 'end'
  as?: 'p' | 'span' | 'div' | 'h1' | 'h2' | 'h3' | 'label'
}>(), {
  variant: 'body',
  tone: 'primary',
  align: undefined,
  as: 'p'
})

const VARIANT: Record<DsTextVariant, string> = {
  'title-lg': 'ds:font-title ds:text-title-lg',
  'title-md': 'ds:font-title ds:text-title-md',
  'button': 'ds:font-title ds:text-button',
  'body': 'ds:font-body ds:text-body',
  'caption': 'ds:font-body ds:text-caption',
  'badge': 'ds:font-title ds:text-badge'
}
const TONE: Record<DsTextTone, string> = {
  primary: 'ds:text-text-primary',
  secondary: 'ds:text-text-secondary',
  inverse: 'ds:text-text-inverse',
  accent: 'ds:text-accent',
  link: 'ds:text-link',
  inherit: ''
}
const ALIGN = { start: 'ds:text-start', center: 'ds:text-center', end: 'ds:text-end' }

const classes = computed(() => [VARIANT[props.variant], TONE[props.tone], props.align ? ALIGN[props.align] : ''])
</script>

<template>
  <component
    :is="as"
    :class="classes"
  >
    <slot />
  </component>
</template>
