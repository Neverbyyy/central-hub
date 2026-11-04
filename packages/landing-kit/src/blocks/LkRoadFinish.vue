<script setup lang="ts">
/**
 * Финиш внизу страницы: команда на старт и значки сторов, по бокам шарики. Шарики — картинка, поверх
 * проявляется Rive (LkInteractive); вне экрана анимация стоит, не загрузилась — остаётся картинка.
 * Когда использовать: лендинг с config.road. Цвета — color.lp.sign, размер шариков — spacing.lp-road-balloons-w.
 */
import { DsGameTitle, DsImage, DsRive, DsStoreBadges, type DsStore } from '@amaya/ui'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLanding } from '../useLanding'
import LkInteractive from './LkInteractive.vue'

const { config, links, storeClick } = useLanding()
const { t } = useI18n()
const finish = config.road!.finish
const SIDES = ['lk-road-finish__balloons--start', 'lk-road-finish__balloons--end']

const badges = computed(() => ({
  appStore: { href: links.value.appStore, src: config.badges.appStore, label: t(config.badges.appStoreLabel) },
  googlePlay: { href: links.value.googlePlay, src: config.badges.googlePlay, label: t(config.badges.googlePlayLabel) }
}))

const onStore = (store: DsStore) => storeClick(store, 'final')
</script>

<template>
  <section class="ds:relative ds:overflow-hidden ds:bg-lp-sign ds:pb-12 ds:pt-12">
    <div
      v-for="side in SIDES"
      :key="side"
      class="lk-road-finish__balloons ds:pointer-events-none ds:absolute ds:top-3 ds:w-lp-road-balloons-w"
      :class="side"
      :style="{ aspectRatio: finish.balloons.ratio }"
      aria-hidden="true"
    >
      <DsImage
        class="ds:absolute ds:inset-0"
        :set="finish.balloons.poster"
        alt=""
        loading="lazy"
      />
      <LkInteractive>
        <div class="ds:absolute ds:inset-0">
          <DsRive
            class="ds:size-full"
            :src="finish.balloons.src"
            :artboard="finish.balloons.artboard"
            alt=""
          />
        </div>
      </LkInteractive>
    </div>

    <div class="ds:relative ds:px-6">
      <DsGameTitle
        class="ds:max-w-full ds:wrap-break-word ds:text-balance ds:wide:text-lp-road-title-wide"
        as="h2"
        variant="lp-hero"
      >
        {{ t(finish.title) }}
      </DsGameTitle>
      <p class="ds:m-0 ds:mt-3 ds:text-center ds:font-display ds:text-lp-lead ds:text-lp-on-sign ds:wrap-break-word">
        {{ t(finish.text) }}
      </p>
    </div>
    <div class="ds:relative ds:mt-6 ds:flex ds:justify-center ds:px-6">
      <DsStoreBadges
        v-bind="badges"
        @click="onStore"
      />
    </div>
  </section>
</template>

<style scoped>
.lk-road-finish__balloons--start {
  left: -1.5rem;
  transform: rotate(-8deg);
}

.lk-road-finish__balloons--end {
  right: -1.5rem;
  transform: rotate(8deg) scaleX(-1);
}
</style>
