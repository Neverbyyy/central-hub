<script setup lang="ts">
/**
 * Дорожная раскладка лендинга: страница как поездка — живой первый экран, автомойка, миры, преимущества, видео, отзывы,
 * FAQ и финиш. Блоки во всю ширину, между ними дорожные полосы. Вход в стор — значки; закреплённая кнопка — по stickyCta.
 * Когда использовать: включается сама, если в конфиге есть road; LkPage выбирает раскладку.
 */
import { useI18n } from 'vue-i18n'
import { useLanding } from '../useLanding'
import LkFaq from './LkFaq.vue'
import LkFooter from './LkFooter.vue'
import LkReviews from './LkReviews.vue'
import LkRoadFeatures from './LkRoadFeatures.vue'
import LkRoadFinish from './LkRoadFinish.vue'
import LkRoadHero from './LkRoadHero.vue'
import LkRoadWash from './LkRoadWash.vue'
import LkRoadWorlds from './LkRoadWorlds.vue'
import LkStickyCta from './LkStickyCta.vue'
import LkStripe from './LkStripe.vue'
import LkVideo from './LkVideo.vue'

const { config } = useLanding()
const { t } = useI18n()
const road = config.road!
</script>

<template>
  <div class="ds:bg-lp-section">
    <main>
      <LkRoadHero />
      <LkStripe />
      <LkRoadWash />
      <LkStripe />
      <LkRoadWorlds />
      <LkStripe kind="dashes" />
      <LkRoadFeatures />
      <LkStripe kind="dashes" />
      <section
        v-if="config.video"
        class="ds:mx-auto ds:max-w-lp-column ds:pb-10"
      >
        <h2 class="ds:m-0 ds:mb-5 ds:px-6 ds:text-center ds:font-display ds:text-lp-section-title ds:text-lp-on-section ds:wrap-break-word">
          {{ t(road.videoTitle) }}
        </h2>
        <LkVideo plain />
      </section>
      <section
        v-if="config.reviews"
        class="ds:pb-6"
      >
        <h2 class="ds:m-0 ds:mb-5 ds:px-6 ds:text-center ds:font-display ds:text-lp-section-title ds:text-lp-on-section ds:wrap-break-word">
          {{ t(road.reviewsTitle) }}
        </h2>
        <LkReviews />
      </section>
      <LkStripe
        class="ds:mb-8"
        kind="dashes"
      />
      <div class="ds:mx-auto ds:max-w-lp-column ds:pb-12">
        <LkFaq />
      </div>
      <LkStripe kind="checker" />
      <LkRoadFinish />
      <LkStripe kind="checker" />
    </main>
    <LkFooter />
    <LkStickyCta v-if="config.stickyCta && config.cta" />
  </div>
</template>
