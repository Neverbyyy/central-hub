<script setup lang="ts">
/**
 * Главная кнопка экрана: «Продолжить», «Купить», «Попробовать бесплатно». Текст — слотом, ключом из сервиса.
 * Когда использовать: основное действие (primary) или второстепенное (secondary). Для ссылки в тексте — DsLink.
 *
 * Поведение по ТЗ: «нажато» видно сразу на касании; зона нажатия не меньше 44×44 (высота — токен spacing.button,
 * на iPad 64); двойной тап не срабатывает дважды (800 мс); в loading нажатия не проходят, ширина не меняется.
 * Анимируются только transform и opacity.
 */
import { usePressed } from '../composables/usePressed'
import { useTapGuard } from '../composables/useTapGuard'
import DsSpinner from './DsSpinner.vue'

const props = withDefaults(defineProps<{
  variant?: 'primary' | 'secondary'
  // Во всю ширину родителя
  block?: boolean
  loading?: boolean
  disabled?: boolean
  // Блик, бегущий по кнопке (как в пейволлах Cars 2)
  shine?: boolean
  type?: 'button' | 'submit'
  // Подпись спиннера для скринридера, ключом из сервиса
  loadingLabel?: string
}>(), {
  variant: 'primary',
  block: false,
  loading: false,
  disabled: false,
  shine: false,
  type: 'button',
  loadingLabel: undefined
})

const emit = defineEmits<{ click: [event: MouseEvent] }>()

const guard = useTapGuard()
const { pressed, handlers } = usePressed()

const onClick = (event: MouseEvent) => {
  if (props.loading || props.disabled) return
  guard(() => emit('click', event))
}

const VARIANT = {
  primary: 'ds:bg-cta-bg ds:text-cta-text ds:data-pressed:bg-cta-bg-pressed',
  secondary: 'ds:border-2 ds:border-secondary-border ds:bg-secondary-bg ds:text-secondary-text'
}
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    :aria-busy="loading || undefined"
    :data-pressed="pressed && !loading && !disabled ? '' : undefined"
    class="ds-button ds:relative ds:inline-flex ds:min-h-button ds:min-w-touch ds:items-center ds:justify-center ds:overflow-hidden ds:rounded-button ds:px-6 ds:font-title ds:text-button ds:no-select ds:transition-transform ds:duration-(--ds-duration-fast) ds:ease-standard ds:data-pressed:scale-96 ds:disabled:opacity-50"
    :class="[VARIANT[variant], { 'ds:w-full': block, 'ds-button--shine': shine && !loading && !disabled }]"
    v-on="handlers"
    @click="onClick"
  >
    <span
      class="ds:relative ds:transition-opacity ds:duration-(--ds-duration-fast)"
      :class="{ 'ds:opacity-0': loading }"
    ><slot /></span>
    <span
      v-if="loading"
      class="ds:absolute ds:inset-0 ds:flex ds:items-center ds:justify-center"
    >
      <DsSpinner :label="loadingLabel" />
    </span>
  </button>
</template>

<style scoped>
/* Блик: полоса цвета текста кнопки пробегает слева направо раз в 4 с — только transform */
.ds-button--shine::before {
  content: '';
  position: absolute;
  top: -50%;
  left: 0;
  width: 25%;
  height: 200%;
  background: currentColor;
  opacity: 0.25;
  transform: translateX(-200%) rotate(25deg);
  animation: ds-button-shine 4s infinite;
  pointer-events: none;
}

@keyframes ds-button-shine {
  0%,
  75% {
    transform: translateX(-200%) rotate(25deg);
  }

  100% {
    transform: translateX(500%) rotate(25deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .ds-button--shine::before {
    animation: none;
    opacity: 0;
  }
}
</style>
