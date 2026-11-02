<script setup lang="ts">
/**
 * Игровой заголовок: в Cars 2 — Nunito 900 с белой обводкой вокруг букв, в base/Farm — без обводки.
 * Цвета color.title.fill / .accent / .stroke, толщина обводки line.display (display-*) и line.title (title-*).
 * Когда использовать: крупный заголовок пейволла или лендинга в стиле игры. Обычный заголовок — DsText.
 *
 * Выделенные слова — тегом <em> внутри (цвет color.title.accent): «<em>All cars</em> and <em>20+ fun apps</em>».
 * Текст с выделением собирается из ключей через <i18n-t> — склеивать строки в коде нельзя.
 * Строки разного размера (крупная первая и мельче остальные, как на карточке Cars 2) — два заголовка подряд.
 */
import DsOutlineText from './DsOutlineText.vue'

type Variant = 'display-lg' | 'display-md' | 'title-lg' | 'title-md'

withDefaults(defineProps<{
  variant?: Variant
  align?: 'start' | 'center' | 'end'
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'div'
}>(), {
  variant: 'title-lg',
  align: 'center',
  as: 'h1'
})

const VARIANT: Record<Variant, string> = {
  'display-lg': 'ds:font-display ds:text-display-lg',
  'display-md': 'ds:font-display ds:text-display-md',
  'title-lg': 'ds:font-title ds:text-title-lg ds:case-title-lg',
  'title-md': 'ds:font-title ds:text-title-md'
}
const LINE: Record<Variant, string> = {
  'display-lg': 'var(--ds-line-display)',
  'display-md': 'var(--ds-line-display)',
  'title-lg': 'var(--ds-line-title)',
  'title-md': 'var(--ds-line-title)'
}
const ALIGN = { start: 'ds:text-start', center: 'ds:text-center', end: 'ds:text-end' }
</script>

<template>
  <component
    :is="as"
    class="ds-game-title ds:text-title-fill"
    :class="[VARIANT[variant], ALIGN[align]]"
  >
    <DsOutlineText
      color="var(--ds-color-title-stroke)"
      :width="LINE[variant]"
    >
      <slot />
    </DsOutlineText>
  </component>
</template>

<style>
/* Выделенные слова: не курсив, а цвет акцента темы. Без scoped — <em> приходит из слота экрана */
.ds-game-title em {
  font-style: normal;
}

.ds-game-title .ds-outline__fill em {
  color: var(--ds-color-title-accent);
}
</style>
