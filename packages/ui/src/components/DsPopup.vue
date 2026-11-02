<script setup lang="ts">
/**
 * Попап снизу поверх экрана: затемнение и панель, которая выезжает снизу (попап «More Plans» Cars 2).
 * Содержимое и крестик — слотом: где крестик и как выглядит шапка, решает экран. Закрывается касанием затемнения
 * и клавишей Esc — событие close. Если содержимое выше видимой панели (прижато к низу во всю высоту экрана)
 * и его пустая часть пропускает касания (pointer-events: none), касание там тоже закрывает попап. Затемнение color.bg.backdrop; анимации — только opacity и transform.
 * Когда использовать: дополнительный выбор поверх пейволла. Не для подтверждений и не для длинных текстов.
 */
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  open: boolean
  // Подпись для скринридера, ключом из сервиса
  label?: string
}>(), {
  label: undefined
})

const emit = defineEmits<{ close: [] }>()

const panel = ref<HTMLElement | null>(null)

const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') emit('close')
}

watch(() => props.open, async (open) => {
  if (typeof document === 'undefined') return
  if (open) {
    document.addEventListener('keydown', onKeydown)
    await nextTick()
    panel.value?.focus({ preventScroll: true })
  } else {
    document.removeEventListener('keydown', onKeydown)
  }
}, { immediate: true })

onBeforeUnmount(() => {
  if (typeof document !== 'undefined') document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Transition name="ds-popup-fade">
    <div
      v-if="open"
      class="ds:absolute ds:inset-0 ds:z-10 ds:bg-bg-backdrop"
      aria-hidden="true"
      @click="emit('close')"
    />
  </Transition>
  <Transition name="ds-popup-slide">
    <div
      v-if="open"
      ref="panel"
      role="dialog"
      aria-modal="true"
      :aria-label="label"
      tabindex="-1"
      class="ds:absolute ds:inset-x-0 ds:bottom-0 ds:z-10 ds:outline-none"
      @click.self="emit('close')"
    >
      <slot />
    </div>
  </Transition>
</template>

<style scoped>
.ds-popup-fade-enter-active,
.ds-popup-fade-leave-active {
  transition: opacity var(--ds-duration-base) var(--ds-ease-standard);
}

.ds-popup-fade-enter-from,
.ds-popup-fade-leave-to {
  opacity: 0;
}

.ds-popup-slide-enter-active,
.ds-popup-slide-leave-active {
  transition: transform var(--ds-duration-base) var(--ds-ease-standard);
}

.ds-popup-slide-enter-from,
.ds-popup-slide-leave-to {
  transform: translateY(100%);
}

@media (prefers-reduced-motion: reduce) {
  .ds-popup-slide-enter-active,
  .ds-popup-slide-leave-active {
    transition: opacity var(--ds-duration-base) var(--ds-ease-standard);
  }

  .ds-popup-slide-enter-from,
  .ds-popup-slide-leave-to {
    transform: none;
    opacity: 0;
  }
}
</style>
