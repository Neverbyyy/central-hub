<script setup lang="ts">
/**
 * Преимущества: иллюстрация, заголовок и пояснение — две колонки (160 на телефоне, 300 от 640 px), под ними кнопка.
 * Колонка — половина ряда минус поля, но не шире макета: где двум колонкам с полями тесно (телефон уже 360,
 * ширина 640–663), они сужаются, а не переносятся по одной.
 */
import { DsImage } from '@amaya/ui'
import { useI18n } from 'vue-i18n'
import { useLanding } from '../useLanding'
import LkCta from './LkCta.vue'

const { config } = useLanding()
const { t } = useI18n()
</script>

<template>
  <section class="ds:flex ds:flex-col ds:items-center">
    <div class="ds:flex ds:w-full ds:flex-wrap ds:justify-center">
      <div
        v-for="(feature, index) in config.features"
        :key="index"
        class="ds:mx-2.5 ds:mb-5 ds:flex ds:w-[calc(50%_-_--spacing(5))] ds:max-w-lp-feature-w ds:flex-col ds:items-center ds:text-center ds:text-lp-text ds:wide:mx-4 ds:wide:mb-8 ds:wide:w-[calc(50%_-_--spacing(8))] ds:wide:max-w-lp-feature-w-wide"
        data-feature
      >
        <div class="ds:h-lp-feature-img-h ds:w-lp-feature-img-w ds:wide:h-lp-feature-img-h-wide ds:wide:w-lp-feature-img-w-wide">
          <DsImage
            :set="feature.art"
            alt=""
            loading="lazy"
          />
        </div>
        <h2 class="ds:m-0 ds:mt-2 ds:font-display ds:text-lp-feature-title ds:wide:mt-6 ds:wide:text-lp-feature-title-wide">
          {{ t(feature.title) }}
        </h2>
        <p class="ds:m-0 ds:mt-1 ds:font-display ds:text-lp-feature-text ds:wide:mt-2 ds:wide:text-lp-feature-text-wide">
          {{ t(feature.text) }}
        </p>
      </div>
    </div>
    <LkCta
      class="ds:mt-3"
      source="features"
    />
  </section>
</template>
