<script setup lang="ts">
/**
 * Корень экрана дизайн-системы: внутри действуют сброс стилей и тема (атрибут data-ds-theme), снаружи — стили хоста
 * (InApp, Pages Hub) не задеты. Новая игра — новая тема в @amaya/tokens, компоненты внутри не меняются.
 * Когда использовать: один раз на экран — шаблоны пейволлов (Pw*) и LkPage ставят его сами.
 */
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
