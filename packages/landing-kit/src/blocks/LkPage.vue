<script setup lang="ts">
/**
 * Лендинг целиком по конфигу: шапка, первый экран, преимущества, видео, синий блок (отзывы, FAQ, финальная кнопка),
 * футер. Колонка шириной до 768 (spacing.lp-column): на телефоне и планшете — во весь экран, на широком — белая
 * карточка со скруглением на фоне color.lp.page, как кадр в макете. Тема — из конфига, язык — у vue-i18n приложения.
 * Когда использовать: страница лендинга (apps/landings) и её история в Storybook. Новый лендинг — новый конфиг.
 */
import { DsRoot } from '@amaya/ui'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { LandingConfig } from '../config'
import { provideLanding } from '../useLanding'
import LkCta from './LkCta.vue'
import LkFaq from './LkFaq.vue'
import LkFeatures from './LkFeatures.vue'
import LkFooter from './LkFooter.vue'
import LkHeader from './LkHeader.vue'
import LkHero from './LkHero.vue'
import LkReviews from './LkReviews.vue'
import LkRoadLayout from './LkRoadLayout.vue'
import LkStickyCta from './LkStickyCta.vue'
import LkStores from './LkStores.vue'
import LkVideo from './LkVideo.vue'

const props = defineProps<{ config: LandingConfig }>()

const { heroLoaded } = provideLanding(props.config)
const { locale } = useI18n()
const fontLater = computed(() => (heroLoaded.value ? '' : 'lk-page--font-later'))
</script>

<template>
  <DsRoot
    :theme="config.theme"
    :lang="locale"
    class="ds:min-h-vh ds:bg-lp-page"
    :class="config.road ? '' : 'ds:medium:py-8'"
  >
    <LkRoadLayout v-if="config.road" />
    <div
      v-else
      class="ds:mx-auto ds:max-w-lp-column ds:overflow-hidden ds:bg-lp-surface ds:medium:rounded-lp-card"
    >
      <LkHeader />
      <main>
        <LkHero />
        <LkFeatures />
        <LkVideo />
        <!-- Синий блок: видео заходит на него сверху. Нет ни видео, ни отзывов, ни FAQ — блока нет: кнопка
             уже стоит под преимуществами, а пустой синий фон с одной кнопкой выглядит как недогрузка -->
        <div
          v-if="config.video || config.reviews || config.faq"
          class="ds:bg-lp-section"
          :class="[
            config.cta ? 'ds:pb-24' : 'ds:pb-4',
            config.video ? 'ds:-mt-lp-video-overlap ds:pt-lp-video-overlap ds:wide:-mt-lp-video-overlap-wide ds:wide:pt-lp-video-overlap-wide' : 'ds:pt-24'
          ]"
        >
          <div
            v-if="config.reviews"
            class="ds:pt-22 ds:wide:pt-19"
            :class="fontLater"
          >
            <LkReviews />
          </div>
          <div
            v-if="config.faq"
            class="ds:mt-20"
          >
            <LkFaq />
          </div>
          <LkCta
            class="ds:mt-24"
            source="final"
          />
          <!-- Кнопки нет: внизу длинной страницы вход в стор — значки. Они ниже кнопки, поэтому и отступы меньше:
               снизу блока почти ничего, основной зазор даёт отступ футера -->
          <div
            v-if="!config.cta"
            class="ds:mt-14 ds:flex ds:justify-center ds:px-6"
          >
            <LkStores source="final" />
          </div>
        </div>
      </main>
      <LkFooter :class="fontLater" />
    </div>
    <LkStickyCta v-if="config.stickyCta && config.cta && !config.road" />
  </DsRoot>
</template>

<style scoped>
/* Open Sans нужен только отзывам и футеру, но браузер запрашивает его сразу: 47 КБ делят сеть с картинкой первого
   экрана. Пока она грузится, этот шрифт им не назначен. Замена идёт за пределами экрана, поэтому ничего не прыгает.
   Класс на этих двух блоках, а не на корне: иначе его снятие пересчитывает стили всей страницы */
.lk-page--font-later {
  --ds-font-lp-body: Arial, sans-serif;
}
</style>
