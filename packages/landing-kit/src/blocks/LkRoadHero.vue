<script setup lang="ts">
/**
 * Первый экран дорожного лендинга: сверху логотип и заголовок на небе, под ними живая сцена, внизу на асфальте значки
 * сторов — они видны и нажимаются сразу. Сцена — картинка (кадр той же анимации, она же LCP), поверх неё через
 * LkInteractive проявляется Rive из той же позы и играет постоянно; вне экрана стоит, не загрузился — остаётся картинка.
 * На телефоне сцена видна целиком, поэтому высота блока — по содержимому. На экране шире сцена заполняет его за текстом.
 * Когда использовать: первый экран лендинга с config.road. Цвета — color.lp.sky, color.lp.section.
 */
import { DsGameTitle, DsImage, DsRive, DsStoreBadges, type DsStore } from '@amaya/ui'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLanding } from '../useLanding'
import LkInteractive from './LkInteractive.vue'
import LkStripe from './LkStripe.vue'

const { config, links, storesId, markHeroLoaded, storeClick } = useLanding()
const { t } = useI18n()
const hero = config.hero
const scene = config.road!.scene

const badges = computed(() => ({
  appStore: { href: links.value.appStore, src: config.badges.appStore, label: t(config.badges.appStoreLabel) },
  googlePlay: { href: links.value.googlePlay, src: config.badges.googlePlay, label: t(config.badges.googlePlayLabel) }
}))

const art = ref<HTMLElement | null>(null)

// Страница собрана заранее: картинка могла загрузиться до гидратации, и события load уже не будет
onMounted(() => {
  if (art.value?.querySelector('img')?.complete) markHeroLoaded()
})

const onStore = (store: DsStore) => storeClick(store, 'hero')
</script>

<template>
  <section
    :id="`${config.id}-hero`"
    class="lk-road-hero ds:relative ds:flex ds:flex-col ds:bg-lp-sky"
  >
    <div class="ds:relative ds:flex ds:min-h-0 ds:flex-1 ds:flex-col ds:overflow-hidden">
      <div class="ds:relative ds:z-10 ds:flex ds:flex-col ds:items-center ds:px-6 ds:pb-6 ds:pt-4 ds:phone-landscape:px-3">
        <div class="ds:h-lp-logo-h ds:w-lp-logo-w ds:phone-landscape:hidden">
          <DsImage
            :src="config.header.logo"
            :alt="t(config.header.logoLabel)"
          />
        </div>
        <DsGameTitle
          class="ds:mt-3 ds:max-w-full ds:wrap-break-word ds:text-balance ds:large:text-lp-road-title-wide ds:phone-landscape:mt-0 ds:phone-landscape:text-lp-section-title"
          variant="lp-hero"
        >
          {{ t(hero.title) }}
        </DsGameTitle>
        <p class="ds:m-0 ds:mt-3 ds:max-w-lp-road-text-w ds:text-center ds:font-display ds:text-lp-lead ds:text-lp-on-sign ds:text-balance ds:wrap-break-word ds:phone-landscape:mt-1 ds:phone-landscape:max-w-none ds:phone-landscape:text-lp-hint">
          {{ t(hero.text) }}
        </p>
      </div>

      <div
        ref="art"
        class="lk-road-hero__art ds:w-full"
      >
        <DsImage
          class="ds:absolute ds:inset-0"
          :set="hero.art"
          alt=""
          fit="cover"
          position="bottom"
          priority="high"
          @load="markHeroLoaded"
          @error="markHeroLoaded"
        />
        <LkInteractive :delay="1200">
          <div class="ds:absolute ds:inset-0">
            <DsRive
              class="ds:size-full"
              :src="scene.src"
              :artboard="scene.artboard"
              :animations="scene.idle"
              fit="cover"
              alignment="bottomCenter"
              alt=""
              data-hero-rive
            />
          </div>
        </LkInteractive>
        <span class="lk-road-hero__sky ds:absolute ds:inset-x-0 ds:top-0" />
      </div>
      <!-- Верх арта растворяется в небе, низ — в асфальте: слои поверх холста, маска на живом холсте стоила бы кадров -->
      <div class="lk-road-hero__road ds:pointer-events-none ds:absolute ds:inset-x-0 ds:bottom-0" />
    </div>

    <LkStripe />
    <div
      :id="storesId"
      class="lk-road-hero__stores ds:flex ds:justify-center ds:bg-lp-section ds:px-6 ds:py-5 ds:phone-landscape:py-3"
    >
      <DsStoreBadges
        v-bind="badges"
        @click="onStore"
      />
    </div>
  </section>
</template>

<style scoped>
/* Портрет: сцена целиком, во всю ширину экрана. Верх арта — небо, поэтому он немного заходит под текст */
.lk-road-hero__art {
  position: relative;
  aspect-ratio: 1372 / 980;
  margin-top: -1.5rem;
}

.lk-road-hero__sky {
  height: 16%;
  background: linear-gradient(180deg, var(--ds-color-lp-sky), transparent);
}

.lk-road-hero__road {
  height: 2rem;
  background: linear-gradient(180deg, transparent, var(--ds-color-lp-section));
}

/* Самый низкий портрет: отступы меньше, чтобы значки сторов остались на экране и с подзаголовком в три строки */
@media (orientation: portrait) and (max-height: 600px) {
  .lk-road-hero__art {
    margin-top: -2.5rem;
  }

  .lk-road-hero__stores {
    padding-block: 0.75rem;
  }
}

/* Экран почти квадратный и шире: высоты на текст и сцену друг под другом не хватит, значки сторов ушли бы за край.
   Сцена заполняет первый экран за текстом и прижата к низу. Телефоны и iPad в портрете сюда не попадают */
@media (min-aspect-ratio: 5 / 6) {
  .lk-road-hero {
    min-height: var(--vh, 100vh);
  }

  @supports (height: 100dvh) {
    .lk-road-hero {
      min-height: var(--vh, 100dvh);
    }
  }

  .lk-road-hero__art {
    position: absolute;
    inset: 0;
    aspect-ratio: auto;
    margin-top: 0;
  }
}

/* Телефон в альбомной: высоты мало, заголовок и арт не помещаются один над другим. Арт ниже — голова енота под
   заголовком, ноги уходят под асфальт */
@media (orientation: landscape) and (max-height: 500px) {
  .lk-road-hero__art {
    inset: 0 0 auto;
    aspect-ratio: 1372 / 980;
    transform: translateY(-36%);
  }
}
</style>
