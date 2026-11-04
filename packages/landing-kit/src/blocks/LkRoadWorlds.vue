<script setup lang="ts">
/**
 * Миры игры: заголовок и ряд ярких карточек с наборами машин. На телефоне и планшете ряд листается пальцем (DsCarousel) и
 * намекает на это сам, на компьютере листать мышью неудобно: все карточки стоят в ряд по центру.
 * Когда использовать: лендинг с config.road. Цвета — color.lp.section, размеры — spacing.lp-road-world-*.
 */
import { DsCarousel, DsImage } from '@amaya/ui'
import { useI18n } from 'vue-i18n'
import { useLanding } from '../useLanding'

const { config, heroLoaded } = useLanding()
const { t } = useI18n()
const worlds = config.road!.worlds
</script>

<template>
  <section class="ds:bg-lp-section ds:pb-6 ds:pt-10">
    <h2 class="ds:m-0 ds:px-6 ds:text-center ds:font-display ds:text-lp-section-title ds:text-lp-on-section ds:wrap-break-word">
      {{ t(worlds.title) }}
    </h2>
    <p class="ds:m-0 ds:mx-auto ds:mt-2 ds:max-w-lp-road-text-w ds:px-6 ds:text-center ds:font-display ds:text-lp-lead ds:text-lp-sign ds:wrap-break-word">
      {{ t(worlds.text) }}
    </p>
    <DsCarousel
      class="lk-road-worlds ds:mt-6 ds:scroll-px-6 ds:px-6 ds:pb-3"
      hint
    >
      <div
        v-for="(world, index) in worlds.items"
        :key="index"
        class="lk-road-worlds__card ds:me-4 ds:h-lp-road-world-h ds:w-lp-road-world-w ds:shrink-0 ds:overflow-hidden ds:rounded-lp-card ds:bg-lp-on-section ds:shadow-(--ds-shadow-lp-card)"
        data-road-world
      >
        <DsImage
          v-if="heroLoaded"
          class="ds:size-full"
          :set="world"
          alt=""
          fit="cover"
          loading="lazy"
        />
      </div>
    </DsCarousel>
  </section>
</template>

<style scoped>
/* Компьютер: карточки делят ширину поровну, но не больше своего размера, поэтому помещаются все и стоят по центру */
@media (min-width: 1024px) {
  .lk-road-worlds {
    justify-content: center;
  }

  .lk-road-worlds .lk-road-worlds__card {
    flex: 1 1 0;
    width: auto;
    min-width: 0;
    max-width: var(--ds-spacing-lp-road-world-w);
    height: auto;
    aspect-ratio: 208 / 288;
  }

  .lk-road-worlds .lk-road-worlds__card:last-child {
    margin-inline-end: 0;
  }
}
</style>
