<script setup lang="ts">
/**
 * Первый экран: арт (живой Rive — во весь арт — проявляется после загрузки страницы), голубая «капля» с заголовком,
 * подзаголовком, строкой про сторы, главной кнопкой и значками сторов, и две цветные плашки-преимущества:
 * на телефоне — внизу «капли», от 640 px — по её бокам, как в макете 768.
 * «Капля» и плашки — фигуры из макета (Figma 38:174, 38:179, 38:182), цвет — из темы; длинный текст растягивает
 * «каплю» вниз, плашки держатся за её низ (телефон) или верх (широкий экран).
 */
import { DsButton, DsImage, DsRive, DsStoreBadges, type DsStore } from '@amaya/ui'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLanding } from '../useLanding'
import LkInteractive from './LkInteractive.vue'

const { config, links, storesId, markHeroLoaded, cta, storeClick } = useLanding()
const { t } = useI18n()
const hero = config.hero

const badges = computed(() => ({
  appStore: { href: links.value.appStore, src: config.badges.appStore, label: t(config.badges.appStoreLabel) },
  googlePlay: { href: links.value.googlePlay, src: config.badges.googlePlay, label: t(config.badges.googlePlayLabel) }
}))

const onStore = (store: DsStore) => storeClick(store, 'hero')

// Страница собрана заранее: картинка могла загрузиться до гидратации, и события load уже не будет
const art = ref<HTMLElement | null>(null)
onMounted(() => {
  if (art.value?.querySelector('img')?.complete) markHeroLoaded()
})

const BLOB = 'M215.919 0C85.234 0 0 46.269 0 158.35C0 252.382 6.107 343 215.919 343C372.665 343 398.826 258.305 398.826 181.415C398.826 87.383 351.123 0 215.919 0Z'
const ADVANTAGES = [
  { box: '0 0 203 132', d: 'M102.826 131.895C41.399 133.671 0.908 112.916 0.017 64.391C-0.731 23.679 23.132 2.932 121.753 0.082C195.43 -2.048 202.377 37.772 202.989 71.061C203.737 111.772 166.378 130.058 102.826 131.895Z', color: 'ds:text-lp-adv-1', place: 'ds:start-1.5 ds:wide:-start-34 ds:wide:top-20' },
  { box: '0 0 213 131', d: 'M104.086 0.416C39.623 3.524 -1.669 27.412 0.052 75.819C1.496 116.431 27.636 135.202 131.13 130.212C208.448 126.483 213.549 86.268 212.368 53.06C210.925 12.448 170.778 -2.8 104.086 0.416Z', color: 'ds:text-lp-adv-2', place: 'ds:start-45 ds:wide:start-87 ds:wide:top-50' }
]
</script>

<template>
  <section
    :id="`${config.id}-hero`"
    class="ds:relative ds:pb-24 ds:wide:pb-4"
  >
    <!-- Арт: картинка — сразу (она же LCP), Rive — потом поверх -->
    <div
      ref="art"
      class="ds:relative ds:h-lp-hero-h ds:overflow-hidden ds:wide:h-lp-hero-h-wide"
    >
      <DsImage
        class="ds:absolute ds:inset-0"
        :set="hero.art"
        alt=""
        fit="cover"
        position="right-bottom"
        priority="high"
        @load="markHeroLoaded"
        @error="markHeroLoaded"
      />
      <LkInteractive v-if="hero.rive">
        <div class="ds:absolute ds:inset-0">
          <DsRive
            class="ds:size-full"
            :src="hero.rive.src"
            :artboard="hero.rive.artboard"
            :state-machine="hero.rive.stateMachine"
            fit="cover"
            alignment="bottomCenter"
            alt=""
            data-hero-rive
          />
        </div>
      </LkInteractive>
    </div>

    <!-- «Капля» -->
    <div class="ds:relative ds:-mt-lp-hero-overlap ds:flex ds:justify-center ds:wide:-mt-lp-hero-overlap-wide">
      <div class="ds:relative ds:flex ds:min-h-lp-blob-h ds:w-lp-blob-w ds:shrink-0 ds:justify-center">
        <svg
          class="ds:absolute ds:inset-0 ds:size-full ds:text-lp-section"
          viewBox="0 0 399 343"
          preserveAspectRatio="none"
          aria-hidden="true"
          focusable="false"
        ><path
          :d="BLOB"
          fill="currentColor"
        /></svg>

        <div class="ds:relative ds:flex ds:w-lp-hero-text-w ds:flex-col ds:items-center ds:pb-18 ds:pt-15 ds:text-center ds:wide:pb-10">
          <!-- Слово длиннее колонки (узкий телефон, длинный язык) переносится, а не вылезает за экран -->
          <h1 class="ds:m-0 ds:font-display ds:text-lp-hero-title ds:text-lp-on-section ds:wrap-break-word">
            {{ t(hero.title) }}
          </h1>
          <p class="ds:m-0 ds:mt-2 ds:font-display ds:text-lp-hero-text ds:text-lp-on-section">
            {{ t(hero.text) }}
          </p>
          <p class="ds:m-0 ds:mt-2 ds:font-display ds:text-lp-note ds:text-lp-deep">
            {{ t(hero.note) }}
          </p>
          <DsButton
            class="ds:mt-2"
            variant="lp"
            data-cta="hero"
            @click="cta('hero')"
          >
            {{ t(config.cta) }}
          </DsButton>
          <div
            :id="storesId"
            class="ds:mt-4"
          >
            <DsStoreBadges
              v-bind="badges"
              @click="onStore"
            />
          </div>
        </div>

        <!-- Плашки-преимущества -->
        <div
          v-for="(advantage, index) in ADVANTAGES"
          :key="index"
          class="ds:absolute ds:-bottom-17 ds:flex ds:min-h-lp-adv-h ds:w-lp-adv-w ds:items-center ds:justify-center ds:px-6 ds:py-4 ds:wide:bottom-auto ds:wide:w-lp-adv-w-wide"
          :class="advantage.place"
          :data-advantage="index + 1"
        >
          <svg
            class="ds:absolute ds:inset-0 ds:size-full"
            :class="advantage.color"
            :viewBox="advantage.box"
            preserveAspectRatio="none"
            aria-hidden="true"
            focusable="false"
          ><path
            :d="advantage.d"
            fill="currentColor"
          /></svg>
          <p class="ds:relative ds:m-0 ds:text-center ds:font-display ds:text-lp-adv ds:text-lp-on-section">
            {{ t(hero.advantages[index]!) }}
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
