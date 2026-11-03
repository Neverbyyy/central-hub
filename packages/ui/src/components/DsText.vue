<script setup lang="ts">
/**
 * Текст в стиле токенов: размер сам меняется на 844 px и на iPad (от 844 × 600) и свой у каждой темы, шрифт и капс — из темы.
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

// Шрифт и регистр — из темы: в Farm заголовок экрана и кнопки капсом на Open Sans, в Cars 2 всё на Nunito
const VARIANT: Record<DsTextVariant, string> = {
  'display-lg': 'ds:font-display ds:text-display-lg',
  'display-md': 'ds:font-display ds:text-display-md',
  // Заголовок онбординга: регистр — как у заголовка экрана
  'title-xl': 'ds:font-title ds:text-title-xl ds:case-title-lg',
  'title-lg': 'ds:font-title ds:text-title-lg ds:case-title-lg',
  'title-md': 'ds:font-title ds:text-title-md',
  'body-lg': 'ds:font-body ds:text-body-lg',
  'body': 'ds:font-body ds:text-body',
  'list': 'ds:font-body ds:text-list',
  'caption': 'ds:font-body ds:text-caption',
  'price': 'ds:font-body ds:text-price',
  'button': 'ds:font-button ds:text-button ds:case-button',
  'badge': 'ds:font-body ds:text-badge ds:case-badge',
  'legal': 'ds:font-link ds:text-legal',
  'link': 'ds:font-link ds:text-link'
}
const TONE: Record<DsTextTone, string> = {
  primary: 'ds:text-text-primary',
  secondary: 'ds:text-text-secondary',
  muted: 'ds:text-text-muted',
  inverse: 'ds:text-text-inverse',
  accent: 'ds:text-text-accent',
  positive: 'ds:text-text-positive',
  link: 'ds:text-text-link',
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
