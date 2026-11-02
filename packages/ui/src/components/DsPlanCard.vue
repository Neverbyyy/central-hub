<script setup lang="ts">
/**
 * Карточка тарифа: название, цена, период, приписка («3 days free»), плашка («Best offer»).
 * Когда использовать: только внутри DsPlanPicker — выбор, клавиатуру и блокировку на время покупки держит он.
 *
 * Две раскладки: split — название слева, цена справа (Farm, стиль Amaya Plus); stack — радиокнопка и строки
 * столбиком (попап тарифов Cars 2). Вид из темы: фон и рамка color.plan.*, толщина рамки line.plan / line.plan-selected,
 * поля spacing.plan-x / plan-y, радиус radius.plan. tint — свои цвета у тарифа (Farm On click): рамка всегда,
 * фон у выбранного. emphasis — название и цена жирные (тариф с триалом, тарифы On click).
 * Рамка нарисована тенью внутрь, а не border: у выбранной она толще, и вёрстка от этого не сдвигается.
 */
import { usePressed } from '../composables/usePressed'
import DsBadge from './DsBadge.vue'

const props = withDefaults(defineProps<{
  selected?: boolean
  title?: string
  subtitle?: string
  price?: string
  period?: string
  note?: string
  badge?: string
  layout?: 'split' | 'stack'
  indicator?: 'radio' | 'none'
  tint?: 'sky' | 'violet' | 'pink'
  emphasis?: boolean
  disabled?: boolean
}>(), {
  selected: false,
  title: undefined,
  subtitle: undefined,
  price: undefined,
  period: undefined,
  note: undefined,
  badge: undefined,
  layout: 'split',
  indicator: 'none',
  tint: undefined,
  emphasis: false,
  disabled: false
})

const emit = defineEmits<{ select: [] }>()

const { pressed, handlers } = usePressed()

const onClick = () => {
  if (!props.disabled) emit('select')
}
</script>

<template>
  <button
    type="button"
    role="radio"
    :aria-checked="selected"
    :aria-disabled="disabled || undefined"
    :data-tint="tint"
    :data-pressed="pressed && !disabled ? '' : undefined"
    class="ds-plan ds:relative ds:flex ds:w-full ds:min-h-touch ds:items-center ds:rounded-plan ds:px-plan-x ds:py-plan-y ds:text-start ds:text-text-primary ds:no-select ds:transition-transform ds:duration-(--ds-duration-fast) ds:ease-standard ds:data-pressed:scale-98"
    v-on="handlers"
    @click="onClick"
  >
    <span
      v-if="indicator === 'radio'"
      class="ds:me-2 ds:inline-flex ds:size-4 ds:shrink-0 ds:items-center ds:justify-center ds:self-start ds:rounded-full ds:border ds:border-radio-border ds:bg-radio-bg"
      aria-hidden="true"
    >
      <span
        class="ds:size-3 ds:rounded-full ds:surface-radio-dot ds:transition-[scale,opacity] ds:duration-(--ds-duration-fast) ds:ease-standard"
        :class="selected ? 'ds:scale-100 ds:opacity-100' : 'ds:scale-50 ds:opacity-0'"
      />
    </span>

    <!-- Столбиком: попап тарифов Cars 2 -->
    <span
      v-if="layout === 'stack'"
      class="ds:flex ds:min-w-0 ds:flex-1 ds:flex-col ds:items-start"
    >
      <span
        v-if="title"
        class="ds:font-body ds:text-price"
      >{{ title }}</span>
      <span
        v-if="subtitle"
        class="ds:mt-1 ds:font-body ds:text-caption"
      >{{ subtitle }}</span>
      <span
        v-if="note"
        class="ds:mt-1 ds:font-body ds:text-caption ds:font-black ds:text-text-positive"
      >{{ note }}</span>
    </span>

    <!-- Название слева, цена справа: Farm, Amaya Plus -->
    <template v-else>
      <span class="ds:flex ds:min-w-0 ds:flex-1 ds:flex-col ds:items-start">
        <span
          v-if="title"
          class="ds:font-body ds:text-body ds:case-plan ds:wrap-break-word"
          :class="{ 'ds:font-bold': emphasis }"
        >{{ title }}</span>
        <span
          v-if="subtitle"
          class="ds:mt-0.5 ds:font-body ds:text-caption ds:wrap-break-word"
        >{{ subtitle }}</span>
        <span
          v-if="note"
          class="ds:mt-0.5 ds:font-body ds:text-caption ds:font-bold ds:text-text-positive"
        >{{ note }}</span>
      </span>
      <span
        v-if="price || period"
        class="ds:ms-3 ds:flex ds:shrink-0 ds:flex-col ds:items-end ds:text-end"
      >
        <span
          v-if="price"
          class="ds:font-body ds:text-price"
          :class="{ 'ds:font-bold': emphasis }"
        >{{ price }}</span>
        <span
          v-if="period"
          class="ds:font-body ds:text-price"
          :class="{ 'ds:font-bold': emphasis }"
        >{{ period }}</span>
      </span>
    </template>

    <DsBadge
      v-if="badge"
      class="ds:absolute ds:-top-2 ds:end-4"
    >
      {{ badge }}
    </DsBadge>
  </button>
</template>

<style scoped>
/* Рамка — тенью внутрь: у выбранной толще, и содержимое не сдвигается. Цвета и толщины — токены темы */
.ds-plan {
  --ds-plan-border: var(--ds-color-plan-border);
  --ds-plan-border-selected: var(--ds-color-plan-border-selected);
  --ds-plan-bg-selected: var(--ds-color-plan-bg-selected);

  background: var(--ds-color-plan-bg);
  box-shadow: inset 0 0 0 var(--ds-line-plan) var(--ds-plan-border);
}

.ds-plan[aria-checked='true'] {
  background: var(--ds-plan-bg-selected);
  box-shadow: inset 0 0 0 var(--ds-line-plan-selected) var(--ds-plan-border-selected);
}

.ds-plan[data-tint='sky'] {
  --ds-plan-border: var(--ds-color-tint-sky-border);
  --ds-plan-border-selected: var(--ds-color-tint-sky-border);
  --ds-plan-bg-selected: var(--ds-color-tint-sky-bg);
}

.ds-plan[data-tint='violet'] {
  --ds-plan-border: var(--ds-color-tint-violet-border);
  --ds-plan-border-selected: var(--ds-color-tint-violet-border);
  --ds-plan-bg-selected: var(--ds-color-tint-violet-bg);
}

.ds-plan[data-tint='pink'] {
  --ds-plan-border: var(--ds-color-tint-pink-border);
  --ds-plan-border-selected: var(--ds-color-tint-pink-border);
  --ds-plan-bg-selected: var(--ds-color-tint-pink-bg);
}

.ds-plan[aria-disabled='true'] {
  cursor: default;
}
</style>
