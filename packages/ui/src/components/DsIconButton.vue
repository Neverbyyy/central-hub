<script setup lang="ts">
/**
 * Круглая кнопка со значком: «i» на главной карточке Cars 2 — перевернуть карточку и показать подробности.
 * Заливка surface.info (в Cars 2 — синий градиент), рамка и значок color.info.*, тень shadow.info,
 * размер spacing.icon-button (40, на iPad 56). Зона нажатия не меньше 44×44, «нажато» — сразу на касании.
 * Когда использовать: второстепенное действие значком. Закрыть экран — DsCloseButton. label — ключом из сервиса.
 */
import type { DsIconName } from '@amaya/icons'
import { usePressed } from '../composables/usePressed'
import { useTapGuard } from '../composables/useTapGuard'
import DsIcon from './DsIcon.vue'

withDefaults(defineProps<{
  icon: DsIconName
  label: string
  // Состояние «включено» для скринридера: подробности открыты
  pressedState?: boolean
}>(), {
  pressedState: undefined
})

const emit = defineEmits<{ click: [] }>()

const guard = useTapGuard()
const { pressed, handlers } = usePressed()
</script>

<template>
  <button
    type="button"
    :aria-label="label"
    :aria-pressed="pressedState"
    :data-pressed="pressed ? '' : undefined"
    class="ds-icon-button ds:relative ds:inline-flex ds:size-icon-button ds:shrink-0 ds:items-center ds:justify-center ds:rounded-full ds:border-(length:--ds-line-info) ds:border-info-border ds:surface-info ds:text-info-icon ds:shadow-(--ds-shadow-info) ds:no-select ds:transition-transform ds:duration-(--ds-duration-fast) ds:ease-standard ds:data-pressed:scale-90"
    v-on="handlers"
    @click.stop="guard(() => emit('click'))"
  >
    <span class="ds:inline-flex ds:size-[60%]">
      <DsIcon
        :name="icon"
        size="fill"
      />
    </span>
  </button>
</template>

<style scoped>
/* Зона нажатия 44×44, даже если кнопка меньше */
.ds-icon-button::before {
  content: '';
  position: absolute;
  inset: min(0px, calc((var(--ds-spacing-icon-button) - var(--ds-spacing-touch)) / 2));
}
</style>
