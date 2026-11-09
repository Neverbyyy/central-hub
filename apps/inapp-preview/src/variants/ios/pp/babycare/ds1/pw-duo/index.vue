<script setup lang="ts">
/**
 * Пейволл Baby Care «Paywall B» (Figma 96:21), устроен как вариант InApp ios_pp_babycare_tm1_varb_pw_duo_v1.
 * Вертикальный экран: сверху арт, ниже на голубом градиенте заголовок, три преимущества, два тарифа (год без триала
 * с плашкой — выбран при открытии; неделя с триалом), кнопка, строка под ней и документы.
 * Тариф с триалом меняет кнопку на «Try for free» и строку на «No payment now»; если триал уже был — обычная неделя.
 * Шаблона под вертикальный экран нет, поэтому он собран из Ds* и usePaywall, как онбординг Farm.
 * Размеры — по макету телефона 390×844 (тема babycare); блок под артом занимает ту же долю экрана, что в макете,
 * и DsFit подгоняет его целиком: на маленьком телефоне уменьшает, на iPad — увеличивает.
 * Арт и фон — на весь экран, тексты, тарифы, кнопка и крестик — в safe area.
 */
import { usePaywall, type ScreenProps } from '@amaya/paywall-kit'
import { perWeek } from '@amaya/pricing'
import { DsBenefitList, DsButton, DsCloseButton, DsFit, DsImage, DsLegalLinks, DsPlanPicker, DsRoot, DsText, type DsPlan } from '@amaya/ui'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { config } from './config'

const props = defineProps<ScreenProps>()

const { t } = useI18n()
const tx = config.texts
const { yearNoTrial, weekTrial } = config.products
const days = config.trialDays

const paywall = usePaywall({
  env: props.env,
  required: [yearNoTrial, weekTrial],
  waitFor: ['art'],
  forcePurchasing: () => props.forcePurchasing
})
const { opened, session, wasTrial, busy, purchasing } = paywall

const price = (id: string) => paywall.price(id) ?? ''

// При открытии выбран год, как в InApp; повторное открытие — экран как новый
const selected = ref(0)
watch(session, () => {
  selected.value = 0
})

const plans = computed<DsPlan[]>(() => {
  const year = price(yearNoTrial)
  const week = price(weekTrial)
  return [
    {
      key: yearNoTrial,
      title: t(tx.yearly),
      subtitle: t(tx.justPerYear, { price: year }),
      price: perWeek(year, 'year') ?? '',
      period: t(tx.perWeek),
      badge: t(tx.bestOffer)
    },
    wasTrial.value
      ? { key: weekTrial, title: t(tx.weekly), price: week, period: t(tx.perWeek) }
      : { key: weekTrial, title: t(tx.daysFree, { days }, days), price: t(tx.thenPrice, { price: week }), period: t(tx.perWeek) }
  ]
})

const selectedPlan = computed(() => plans.value[selected.value] ?? plans.value[0])
const isTrial = computed(() => !wasTrial.value && selectedPlan.value?.key === weekTrial)
const buttonText = computed(() => t(isTrial.value ? tx.tryFree : tx.continue))
const note = computed(() => t(isTrial.value ? tx.noPaymentNow : tx.cancelAnytime))
const features = computed(() => tx.features.map(key => t(key)))

// До первого открытия экран уже нарисован (грузятся арт и шрифт), после закрытия — прячется
const shown = computed(() => opened.value || session.value === 0)

// Блок под артом — в своих размерах ширины телефона из макета (390); шире не растягиваем, чтобы на iPad
// он увеличивался целиком, а не расползался
const DESIGN_WIDTH = 390
const fit = ref<{ $el: HTMLElement } | null>(null)
const widthScale = () => (fit.value?.$el.clientWidth ?? DESIGN_WIDTH) / DESIGN_WIDTH

const buy = () => {
  if (selectedPlan.value) paywall.purchase(selectedPlan.value.key)
}
</script>

<template>
  <DsRoot
    :theme="theme ?? config.theme"
    :lang="paywall.data.value?.locale"
    class="ds:relative ds:flex ds:h-vh ds:w-full ds:flex-col ds:overflow-hidden ds:bg-bg-screen ds:no-select ds:transition-opacity ds:duration-(--ds-duration-base) ds:landscape:flex-row"
    :class="shown ? 'ds:opacity-100' : 'ds:pointer-events-none ds:opacity-0'"
  >
    <!-- Арт во всю ширину, под вырезом; внизу переходит в цвет фона, как в макете.
         В альбомной (макета нет) — левая половина, иначе блок с кнопкой не поместился бы по высоте -->
    <section class="ds:relative ds:min-h-0 ds:flex-1 ds:bg-bg-hero ds:landscape:h-full ds:landscape:w-1/2 ds:landscape:flex-none">
      <DsImage
        class="ds:absolute ds:inset-0"
        :set="config.art"
        alt=""
        fit="cover"
        priority="high"
        @load="paywall.markLoaded('art')"
        @error="paywall.markLoaded('art')"
      />
      <div class="ds:absolute ds:inset-0 ds:bg-linear-to-b ds:from-transparent ds:from-80% ds:to-bg-screen ds:landscape:hidden" />
    </section>

    <!-- Доля экрана под блоком — как в макете 390×844 (494 из 844), в альбомной — правая половина на всю высоту.
         Отступы safe area — снаружи DsFit: их он не масштабирует.
         Градиент — только у блока, как в макете: сверху он того же цвета, в который уходит арт, шва нет -->
    <div class="pw-duo__content ds:flex ds:shrink-0 ds:flex-col ds:surface-screen ds:pb-safe ds:pl-safe ds:pr-safe">
      <DsFit
        ref="fit"
        class="ds:min-h-0 ds:flex-1"
        grow
        :max-scale="widthScale"
      >
        <!-- Высота — своя, как в макете (отступы 20 между группами): DsFit меряет её и подгоняет блок целиком -->
        <section class="ds:flex ds:flex-col ds:items-center ds:px-6 ds:pb-4 ds:pt-2">
          <DsText
            as="h1"
            variant="title-lg"
            align="center"
            class="ds:text-balance"
          >
            {{ t(tx.title) }}
          </DsText>

          <DsBenefitList
            class="ds:mt-5"
            tone="primary"
            :items="features"
          />

          <div class="ds:mt-5 ds:flex ds:w-full ds:max-w-68.25 ds:flex-col ds:items-center">
            <DsPlanPicker
              v-model="selected"
              class="ds:w-full"
              :plans="plans"
              indicator="check"
              :label="t(tx.plans)"
              :disabled="busy"
            />
            <DsButton
              data-pw="cta"
              class="ds:mt-6"
              :loading="!!purchasing || forcePurchasing"
              :loading-label="buttonText"
              @click="buy"
            >
              {{ buttonText }}
            </DsButton>
            <DsText
              class="ds:mt-3"
              variant="link"
              align="center"
            >
              {{ note }}
            </DsText>
          </div>

          <DsLegalLinks
            class="ds:mt-5"
            :underline="false"
            :terms="t(tx.terms)"
            :privacy="t(tx.privacy)"
            :restore="t(tx.restore)"
            @terms="paywall.openLegal('terms')"
            @privacy="paywall.openLegal('privacy')"
            @restore="paywall.restore()"
          />
        </section>
      </DsFit>
    </div>

    <div class="ds:pointer-events-none ds:absolute ds:inset-safe">
      <div class="ds:pointer-events-auto ds:absolute ds:end-2 ds:top-2 ds:m-safe-corner">
        <DsCloseButton
          data-pw="close"
          :label="t(tx.close)"
          :active="opened"
          @close="paywall.close()"
        />
      </div>
    </div>
  </DsRoot>
</template>

<style scoped>
/* Блок под артом — та же доля высоты, что в макете телефона: 494 из 844. Арт забирает остальное */
.pw-duo__content {
  height: calc(494 / 844 * 100%);
}

/* Альбомная (макета нет): правая половина на всю высоту, сверху — отступ safe area */
@media (orientation: landscape) {
  .pw-duo__content {
    width: 50%;
    height: 100%;
    padding-top: var(--ds-inset-top);
  }
}
</style>
