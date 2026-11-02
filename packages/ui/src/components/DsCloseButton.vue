<script setup lang="ts">
/**
 * Крестик, который появляется с задержкой — продуктовая логика пейволлов (в InApp 3 с), её не ломать.
 * Когда использовать: закрыть пейволл или онбординг. Место на экране задаёт экран — сам крестик себя не позиционирует.
 *
 * active=true — экран показан, отсчёт задержки; active=false — крестик прячется и отсчёт сбрасывается,
 * поэтому повторно открытый экран «как новый». До появления нажатие не работает; двойной тап — одно закрытие.
 * Размер через min-width/min-height (грабли InApp: иначе анимация делает из круга овал), зона нажатия — 44×44.
 * Вид из темы: квадрат spacing.close (Farm 32, Cars 2 40, на iPad 64 / 56), значок spacing.close-icon,
 * цвет color.close.icon (Farm — светло-лавандовый на белом, Cars 2 — белый на затемнении), подложки нет.
 */
import { onBeforeUnmount, ref, watch } from 'vue'
import { usePressed } from '../composables/usePressed'
import { useTapGuard } from '../composables/useTapGuard'
import DsIcon from './DsIcon.vue'

const props = withDefaults(defineProps<{
  // Подпись для скринридера, ключом из сервиса (ds.close_button.aria.label)
  label: string
  active?: boolean
  delay?: number
  // alt — на светлом попапе (color.close.icon-alt): в Cars 2 синий крестик попапа тарифов
  tone?: 'default' | 'alt'
}>(), {
  active: true,
  delay: 3000,
  tone: 'default'
})

const emit = defineEmits<{ close: [] }>()

const shown = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined

watch(() => [props.active, props.delay] as const, ([active, delay]) => {
  clearTimeout(timer)
  shown.value = false
  if (!active) return
  if (delay <= 0) shown.value = true
  else timer = setTimeout(() => {
    shown.value = true
  }, delay)
}, { immediate: true })

onBeforeUnmount(() => clearTimeout(timer))

const guard = useTapGuard()
const { pressed, handlers } = usePressed()

const onClick = () => {
  if (!shown.value) return
  guard(() => emit('close'))
}
</script>

<template>
  <button
    type="button"
    :aria-label="label"
    :aria-hidden="shown ? undefined : 'true'"
    :tabindex="shown ? undefined : -1"
    :data-shown="shown ? '' : undefined"
    :data-pressed="pressed && shown ? '' : undefined"
    class="ds-close ds:relative ds:inline-flex ds:min-h-close ds:min-w-close ds:items-center ds:justify-center ds:rounded-full ds:bg-close-bg ds:no-select ds:transition-[opacity,scale] ds:duration-(--ds-duration-base) ds:ease-standard"
    :class="[tone === 'alt' ? 'ds:text-close-icon-alt' : 'ds:text-close-icon', shown ? 'ds:opacity-100 ds:scale-100 ds:data-pressed:scale-90' : 'ds:pointer-events-none ds:opacity-0 ds:scale-75']"
    v-on="handlers"
    @click="onClick"
  >
    <span class="ds:inline-flex ds:size-close-icon">
      <DsIcon
        name="close"
        size="fill"
      />
    </span>
  </button>
</template>

<style scoped>
/* Зона нажатия 44×44 вокруг круга 32 — без сдвига вёрстки */
.ds-close::before {
  content: '';
  position: absolute;
  inset: calc((var(--ds-spacing-close) - var(--ds-spacing-touch)) / 2);
}
</style>
