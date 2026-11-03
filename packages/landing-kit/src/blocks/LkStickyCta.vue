<script setup lang="ts">
/**
 * Закреплённая кнопка внизу экрана телефона: выезжает, когда первый экран ушёл из вида, и прячется, когда он
 * вернулся. Только transform. От 640 px не показывается. Включается в конфиге (stickyCta) — у Cars 2 выключена.
 */
import { DsButton } from '@amaya/ui'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLanding } from '../useLanding'

const { config, cta } = useLanding()
const { t } = useI18n()
const shown = ref(false)
let observer: IntersectionObserver | undefined

onMounted(() => {
  const hero = document.getElementById(`${config.id}-hero`)
  if (!hero || typeof IntersectionObserver === 'undefined') return
  observer = new IntersectionObserver(([entry]) => {
    shown.value = !entry?.isIntersecting
  })
  observer.observe(hero)
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div
    class="ds:fixed ds:inset-x-0 ds:bottom-0 ds:z-20 ds:flex ds:justify-center ds:px-6 ds:pb-safe ds:transition-transform ds:duration-(--ds-duration-base) ds:ease-standard ds:wide:hidden"
    :class="shown ? 'ds:translate-y-0' : 'ds:translate-y-full'"
    :aria-hidden="shown ? undefined : 'true'"
    :inert="shown ? undefined : true"
  >
    <DsButton
      class="ds:mb-4"
      variant="lp"
      data-cta="sticky"
      @click="cta('sticky')"
    >
      {{ t(config.cta) }}
    </DsButton>
  </div>
</template>
