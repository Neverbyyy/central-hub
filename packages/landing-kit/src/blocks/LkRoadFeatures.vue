<script setup lang="ts">
/**
 * Преимущества на дороге: заголовок для родителей и карточки-таблички вдоль разметки, картинки ждут первый экран.
 * Когда использовать: лендинг с config.road. Цвета — color.lp.section, surface.lp-card.
 */
import { DsImage } from '@amaya/ui'
import { useI18n } from 'vue-i18n'
import { useLanding } from '../useLanding'

const { config, heroLoaded } = useLanding()
const { t } = useI18n()
</script>

<template>
  <section class="ds:bg-lp-section ds:px-4 ds:pb-6 ds:pt-6">
    <h2 class="ds:m-0 ds:px-2 ds:text-center ds:font-display ds:text-lp-section-title ds:text-lp-on-section ds:wrap-break-word">
      {{ t(config.road!.featuresTitle) }}
    </h2>
    <div class="ds:mx-auto ds:mt-6 ds:flex ds:max-w-lp-road-column ds:flex-wrap ds:justify-center">
      <div
        v-for="(feature, index) in config.features"
        :key="index"
        class="ds:mx-2 ds:mb-4 ds:flex ds:w-[calc(50%_-_--spacing(4))] ds:max-w-lp-feature-w ds:flex-col ds:items-center ds:rounded-lp-card ds:px-3 ds:pb-4 ds:pt-3 ds:text-center ds:surface-lp-card ds:text-lp-text ds:shadow-(--ds-shadow-lp-card)"
        data-feature
      >
        <div class="ds:h-lp-feature-img-h ds:w-lp-feature-img-w ds:max-w-full">
          <DsImage
            v-if="heroLoaded"
            :set="feature.art"
            alt=""
            loading="lazy"
          />
        </div>
        <h3 class="ds:m-0 ds:mt-2 ds:font-display ds:text-lp-feature-title">
          {{ t(feature.title) }}
        </h3>
        <p class="ds:m-0 ds:mt-1 ds:font-display ds:text-lp-feature-text">
          {{ t(feature.text) }}
        </p>
      </div>
    </div>
  </section>
</template>
