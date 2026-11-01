<script setup lang="ts">
// Корень экрана дизайн-системы: внутри действуют сброс стилей и тема. Тема игры — атрибутом data-ds-theme,
// компоненты внутри не меняются: новая игра — это новая тема в @amaya/tokens.
// API Vue 3.3, как в InApp: без defineModel, useTemplateRef и деструктуризации пропсов
import type { DsTheme } from '../themes'

withDefaults(defineProps<{
  theme?: DsTheme
  // Язык текстов внутри: переносы по словам и кавычки браузер берёт отсюда
  lang?: string
}>(), {
  theme: 'base',
  lang: undefined
})
</script>

<template>
  <div
    data-ds-root
    :data-ds-theme="theme"
    :lang="lang"
  >
    <slot />
  </div>
</template>
