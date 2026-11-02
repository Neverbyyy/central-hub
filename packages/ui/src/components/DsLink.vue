<script setup lang="ts">
/**
 * Ссылка-текст. С href — обычная ссылка в новой вкладке; без href — кнопка с событием click
 * (например, «Restore purchases»: что делать, решает экран).
 * Когда использовать: ссылка внутри текста или в строке документов (DsLegalLinks). Основное действие — DsButton.
 * Зона нажатия добирается до 44×44 невидимым слоем — строка текста не раздувается. Двойной тап — одно действие.
 */
import { usePressed } from '../composables/usePressed'
import { useTapGuard } from '../composables/useTapGuard'

const props = withDefaults(defineProps<{
  href?: string
  tone?: 'link' | 'primary' | 'secondary' | 'muted' | 'inverse' | 'inherit'
  underline?: boolean
}>(), {
  href: undefined,
  tone: 'link',
  underline: true
})

const emit = defineEmits<{ click: [event: MouseEvent] }>()

const guard = useTapGuard()
const { pressed, handlers } = usePressed()

const onClick = (event: MouseEvent) => {
  // Ссылка уходит сама; второй тап подряд её не открывает ещё раз
  if (!guard(() => emit('click', event))) event.preventDefault()
}

const TONE = {
  link: 'ds:text-text-link',
  muted: 'ds:text-text-muted',
  primary: 'ds:text-text-primary',
  secondary: 'ds:text-text-secondary',
  inverse: 'ds:text-text-inverse',
  inherit: ''
}
</script>

<template>
  <component
    :is="href ? 'a' : 'button'"
    :href="href"
    :target="href ? '_blank' : undefined"
    :rel="href ? 'noopener' : undefined"
    :type="href ? undefined : 'button'"
    :data-pressed="pressed ? '' : undefined"
    class="ds-link ds:relative ds:inline ds:no-select ds:transition-opacity ds:duration-(--ds-duration-fast) ds:data-pressed:opacity-60"
    :class="[TONE[props.tone], { 'ds:underline ds:underline-offset-2': underline }]"
    v-on="handlers"
    @click="onClick"
  >
    <slot />
  </component>
</template>

<style scoped>
/* Невидимая зона нажатия не меньше 44×44 по центру ссылки */
.ds-link::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: max(100%, var(--ds-spacing-touch));
  height: max(100%, var(--ds-spacing-touch));
  transform: translate(-50%, -50%);
}
</style>
