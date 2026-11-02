<script setup lang="ts">
/**
 * Переключатель триала: строка «Free trial» с тумблером, нажимается вся строка. v-model — modelValue.
 * Когда использовать: пейволл, где триал включают отдельно от выбора тарифа (Farm On start). Текст — ключом из сервиса.
 * Цвета color.switch.* (дорожка, включённая дорожка, бегунок), рамка строки — color.plan.border и line.plan.
 * Высота строки — spacing.button (в Farm 36), зона нажатия — не меньше 44.
 * Бегунок едет через transform; disabled — идёт покупка.
 */
import { usePressed } from '../composables/usePressed'

const props = withDefaults(defineProps<{
  modelValue: boolean
  label: string
  disabled?: boolean
}>(), {
  disabled: false
})

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const { pressed, handlers } = usePressed()

const toggle = () => {
  if (!props.disabled) emit('update:modelValue', !props.modelValue)
}
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="modelValue"
    :aria-disabled="disabled || undefined"
    :data-pressed="pressed && !disabled ? '' : undefined"
    class="ds-trial ds:relative ds:flex ds:w-full ds:min-h-button ds:items-center ds:justify-between ds:rounded-full ds:px-plan-x ds:py-1 ds:text-start ds:no-select ds:transition-transform ds:duration-(--ds-duration-fast) ds:ease-standard ds:data-pressed:scale-98"
    v-on="handlers"
    @click="toggle"
  >
    <span class="ds:font-body ds:text-body ds:text-text-primary">{{ label }}</span>
    <span
      class="ds:relative ds:ms-3 ds:inline-block ds:h-4.5 ds:w-8 ds:shrink-0 ds:rounded-full"
      :class="modelValue ? 'ds:bg-switch-track-on' : 'ds:bg-switch-track'"
      aria-hidden="true"
    >
      <span
        class="ds:absolute ds:start-0.5 ds:top-0.5 ds:size-3.5 ds:rounded-full ds:bg-switch-thumb ds:transition-transform ds:duration-(--ds-duration-base) ds:ease-standard"
        :class="modelValue ? 'ds:translate-x-3.5' : 'ds:translate-x-0'"
      />
    </span>
  </button>
</template>

<style scoped>
/* Рамка строки — тенью внутрь, как у карточки тарифа: цвет и толщина из темы */
.ds-trial {
  box-shadow: inset 0 0 0 var(--ds-line-plan) var(--ds-color-plan-border);
}

/* Высота как у кнопки (spacing.button, в Farm 36), зона нажатия — не меньше 44 */
.ds-trial::after {
  content: '';
  position: absolute;
  inset: min(0px, calc((var(--ds-spacing-button) - var(--ds-spacing-touch)) / 2)) 0;
}
</style>
