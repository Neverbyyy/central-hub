<script setup lang="ts">
/**
 * Онбординг Farm «Onboarding B» (Figma 8:1348), устроен как вариант InApp. Два шага: награды и подписка Amaya Plus.
 * Слева арт шага, справа заголовок, абзац, кнопка «Continue» и документы; на втором шаге — крестик с задержкой.
 * «Continue» на первом шаге открывает второй, на втором — закрывает экран: дальше приложение показывает пейволл.
 * Шаблона под онбординг нет, поэтому экран собран из Ds* и usePaywall: «готов» — после шрифта и арта обоих шагов
 * (второй шаг появляется сразу, без догрузки), повторное открытие — снова с первого шага.
 */
import { usePaywall, type ScreenProps } from '@amaya/paywall-kit'
import { DsButton, DsCloseButton, DsFit, DsImage, DsLegalLinks, DsRoot, DsText } from '@amaya/ui'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { config } from './config'

// Те же пропсы, что у пейволлов: история и эмулятор передают их всем экранам; покупки здесь нет
const props = defineProps<ScreenProps>()

const { t } = useI18n()

const paywall = usePaywall({
  env: props.env,
  // Продуктов онбординг не показывает — показывать его можно без цен
  required: [],
  waitFor: config.steps.map((_, index) => `art-${index}`)
})
const { opened, session } = paywall

const step = ref(0)
const last = computed(() => step.value === config.steps.length - 1)
// Повторное открытие — сразу первый шаг, без анимации смены шага: экран «как новый», ничего не доигрывает
const instant = ref(true)
watch(session, () => {
  instant.value = true
  step.value = 0
})

// Аналитика как у InApp: какая страница показана (mixpanelEventInappScroll)
watch([session, step], () => paywall.track('inapp_scroll', { page_number: step.value + 1 }))

// Кнопка одна на оба шага: её защита от двойного тапа не даёт проскочить второй шаг
const next = () => {
  if (!opened.value) return
  if (last.value) {
    paywall.close()
    return
  }
  instant.value = false
  step.value++
}

// До первого открытия экран уже нарисован (грузятся арт и шрифт), после закрытия — прячется
const shown = computed(() => opened.value || session.value === 0)

// Смена шага: новый текст проявляется и чуть поднимается — только opacity и transform
const FADE = 'ds:transition-[opacity,translate] ds:duration-(--ds-duration-base) ds:ease-standard'
const textClass = (index: number) => [
  instant.value ? '' : FADE,
  index === step.value ? 'ds:opacity-100 ds:translate-y-0' : 'ds:opacity-0 ds:translate-y-2'
]
// Арт следующего шага ложится поверх текущего — без провала яркости, как было бы при встречном затухании
const artClass = (index: number) => [
  instant.value ? '' : FADE,
  index <= step.value ? 'ds:opacity-100' : 'ds:opacity-0'
]
</script>

<template>
  <DsRoot
    :theme="theme ?? config.theme"
    :lang="paywall.data.value?.locale"
    class="ds:relative ds:flex ds:h-vh ds:w-full ds:overflow-hidden ds:bg-bg-screen ds:no-select ds:transition-opacity ds:duration-(--ds-duration-base) ds:portrait:flex-col"
    :class="shown ? 'ds:opacity-100' : 'ds:pointer-events-none ds:opacity-0'"
  >
    <!-- Арт шагов: слои друг на друге, оба грузятся сразу. В портрете (в макете его нет) — пропорции кадра 667,
         но не выше половины экрана: награды сверху и звери снизу видны целиком -->
    <section class="ds:relative ds:w-1/2 ds:shrink-0 ds:overflow-hidden ds:bg-bg-hero ds:portrait:aspect-[334/375] ds:portrait:max-h-1/2 ds:portrait:w-full">
      <DsImage
        v-for="(item, index) in config.steps"
        :key="index"
        class="ds:absolute ds:inset-0"
        :class="artClass(index)"
        :set="item.art"
        alt=""
        fit="cover"
        :priority="index === 0 ? 'high' : 'low'"
        @load="paywall.markLoaded(`art-${index}`)"
        @error="paywall.markLoaded(`art-${index}`)"
      />

      <div class="ds:absolute ds:start-3 ds:top-3 ds:large:top-4">
        <DsCloseButton
          data-pw="close"
          :label="t(config.texts.close)"
          :active="opened && last"
          @close="paywall.close()"
        />
      </div>
    </section>

    <!-- Не помещается по высоте (iPhone SE в альбомной, длинный язык) — уменьшается целиком, а не обрезается -->
    <DsFit class="ds:w-1/2 ds:min-w-0 ds:portrait:w-full ds:portrait:flex-1">
      <section class="ds:flex ds:h-full ds:flex-col ds:justify-between ds:px-8 ds:py-4 ds:large:px-11 ds:large:py-8">
        <!-- Тексты шагов лежат в одной ячейке: высота — по большему, при смене шага ничего не сдвигается.
             Заголовок — строками поровну, как в макете (там перенос стоял вручную, а в тексте сервиса его нет);
             где text-wrap: balance не знают (старые вебвью), перенос обычный -->
        <div class="ds:grid">
          <DsText
            v-for="(item, index) in config.steps"
            :key="index"
            as="h1"
            variant="title-xl"
            align="center"
            class="ds:col-start-1 ds:row-start-1 ds:text-balance"
            :class="textClass(index)"
            :aria-hidden="index === step ? undefined : 'true'"
          >
            {{ t(item.title, { count: config.appsCount }) }}
          </DsText>
        </div>

        <div class="ds:my-2 ds:grid ds:items-center">
          <DsText
            v-for="(item, index) in config.steps"
            :key="index"
            variant="body-lg"
            align="center"
            class="ds:col-start-1 ds:row-start-1"
            :class="textClass(index)"
            :aria-hidden="index === step ? undefined : 'true'"
          >
            {{ t(item.text) }}
          </DsText>
        </div>

        <div class="ds:flex ds:flex-col ds:items-center">
          <DsButton
            data-pw="cta"
            block
            class="ds:max-w-67.5 ds:large:max-w-none"
            @click="next"
          >
            {{ t(config.texts.continue) }}
          </DsButton>
          <DsLegalLinks
            class="ds:mt-6 ds:w-full ds:large:mt-10.5"
            tone="muted"
            :terms="t(config.texts.terms)"
            :privacy="t(config.texts.privacy)"
            @terms="paywall.openLegal('terms')"
            @privacy="paywall.openLegal('privacy')"
          />
        </div>
      </section>
    </DsFit>
  </DsRoot>
</template>
