<script setup lang="ts">
/**
 * Главная кнопка экрана: «Продолжить», «Купить», «Попробовать бесплатно». Текст — слотом, ключом из сервиса.
 * Когда использовать: основное действие (primary) или второстепенное (secondary — в Cars 2 оранжевая «Unlock for»);
 * на лендинге — lp («Play for free!»: крупная, буквы градиентом). Для ссылки в тексте — DsLink.
 * size="sm" — текст мельче (text.button-sm), высота та же; у lp size="lg" — кнопки ниже первого экрана (64 вместо 60).
 *
 * Вид — из темы: заливка surface.cta (в Cars 2 градиент), рамка line.cta, обводка букв line.cta-text,
 * тень shadow.cta, капс case.button (Farm). Высота spacing.button (36 в Farm, 48 в Cars 2, на iPad 64 / 72); зона нажатия — не меньше 44.
 * У lp — surface.cta-lp, буквы surface.cta-lp-text с тенью shadow.cta-lp-text, тени shadow.cta-lp, высота spacing.lp-cta-*.
 * Поведение по ТЗ: «нажато» видно сразу на касании; зона нажатия не меньше 44×44; двойной тап не срабатывает
 * дважды (800 мс); в loading нажатия не проходят, ширина не меняется. Анимируются только transform и opacity.
 */
import { usePressed } from '../composables/usePressed'
import { useTapGuard } from '../composables/useTapGuard'
import DsOutlineText from './DsOutlineText.vue'
import DsSpinner from './DsSpinner.vue'

const props = withDefaults(defineProps<{
  variant?: 'primary' | 'secondary' | 'lp'
  size?: 'md' | 'sm' | 'lg'
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
  size: 'md',
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
  primary: 'ds:surface-cta ds:text-cta-text ds:border-cta-border ds:border-(length:--ds-line-cta) ds:shadow-(--ds-shadow-cta) ds:font-button ds:case-button',
  secondary: 'ds:surface-secondary ds:text-secondary-text ds:border-secondary-border ds:border-(length:--ds-line-secondary) ds:font-button ds:case-button',
  lp: 'ds:surface-cta-lp ds:text-lp-on-section ds:shadow-(--ds-shadow-cta-lp) ds:font-display'
}
// Обводка букв: цвет и толщина из темы; у base толщина 0 — обычный текст
const OUTLINE = {
  primary: { color: 'var(--ds-color-cta-text-stroke)', width: 'var(--ds-line-cta-text)' },
  secondary: { color: 'var(--ds-color-secondary-text-stroke)', width: 'var(--ds-line-secondary-text)' }
}
// Высота, поля и текст — по варианту и размеру: у кнопки лендинга свои
const BUTTON = 'ds:min-h-button ds:px-button-x'
const SIZE = {
  primary: { md: `${BUTTON} ds:text-button`, sm: `${BUTTON} ds:text-button-sm`, lg: `${BUTTON} ds:text-button` },
  secondary: { md: `${BUTTON} ds:text-button`, sm: `${BUTTON} ds:text-button-sm`, lg: `${BUTTON} ds:text-button` },
  lp: { md: 'ds:min-h-lp-cta-h ds:px-lp-cta-x ds:text-lp-cta', sm: 'ds:min-h-lp-cta-h ds:px-lp-cta-x ds:text-lp-cta', lg: 'ds:min-h-lp-cta-lg-h ds:px-lp-cta-lg-x ds:text-lp-cta-lg' }
}
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    :aria-busy="loading || undefined"
    :data-pressed="pressed && !loading && !disabled ? '' : undefined"
    class="ds-button ds:relative ds:inline-flex ds:min-w-touch ds:items-center ds:justify-center ds:rounded-button ds:no-select ds:transition-transform ds:duration-(--ds-duration-fast) ds:ease-standard ds:data-pressed:scale-96 ds:disabled:opacity-50"
    :class="[VARIANT[variant], SIZE[variant][size], { 'ds:w-full': block }]"
    v-on="handlers"
    @click="onClick"
  >
    <span
      v-if="shine && !loading && !disabled"
      class="ds-button__shine ds:pointer-events-none ds:absolute ds:inset-0 ds:overflow-hidden ds:rounded-button"
      aria-hidden="true"
    />
    <span
      class="ds:relative ds:transition-opacity ds:duration-(--ds-duration-fast)"
      :class="{ 'ds:opacity-0': loading }"
    ><span
      v-if="variant === 'lp'"
      class="ds-button__lp-text"
    ><slot /></span><DsOutlineText
      v-else
      :color="OUTLINE[variant].color"
      :width="OUTLINE[variant].width"
    ><slot /></DsOutlineText></span>
    <span
      v-if="loading"
      class="ds:absolute ds:inset-0 ds:flex ds:items-center ds:justify-center"
    >
      <DsSpinner :label="loadingLabel" />
    </span>
  </button>
</template>

<style scoped>
/* Зона нажатия не меньше 44 по высоте: кнопка ниже (в Farm 36) добирает её невидимым слоем, вёрстка не меняется */
.ds-button::after {
  content: '';
  position: absolute;
  inset: min(0px, calc((var(--ds-spacing-button) - var(--ds-spacing-touch)) / 2)) 0;
}

/* Буквы кнопки лендинга: заливка из темы (у Cars 2 — градиент) и тень. Классом, а не утилитой ds:surface-*:
   та задаёт background целиком и сбросила бы background-clip. Тень — drop-shadow: text-shadow
   просвечивал бы сквозь прозрачные буквы */
.ds-button__lp-text {
  display: inline-block;
  background: var(--ds-surface-cta-lp-text);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  filter: drop-shadow(var(--ds-shadow-cta-lp-text));
}

/* Блик: полоса цвета текста кнопки пробегает слева направо раз в 4 с — только transform.
   Обрезается своей обёрткой, а не кнопкой: иначе обрезалась бы и зона нажатия */
.ds-button__shine::before {
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
  .ds-button__shine::before {
    animation: none;
    opacity: 0;
  }
}
</style>
