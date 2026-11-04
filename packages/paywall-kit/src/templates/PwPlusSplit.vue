<script setup lang="ts">
/**
 * Шаблон пейволла Amaya Plus: слева слайды с артом и точками, справа заголовок, тарифы, кнопка и документы.
 * Два режима из конфига (повторяют InApp farm tm4, вариант B):
 * - switch («On start»): преимущества, тумблер «Free trial», год без триала с плашкой и неделя;
 *   тумблер меняет неделю на неделю с триалом и выбирает её;
 * - trio («On click»): неделя, месяц и год с триалом, у каждого свой цвет; под кнопкой — условия триала.
 * Логика экрана — usePaywall; тексты — ключи сервиса (PLUS_TEXTS, конфиг может заменить); цены — из стора.
 * Раскладка — две половины экрана (телефон в альбомной, iPad); в портретной — слайды сверху, тарифы снизу.
 */
import { perWeek } from '@amaya/pricing'
import { DsBenefitList, DsButton, DsCloseButton, DsFit, DsImage, DsLegalLinks, DsPlanPicker, DsRoot, DsSlides, DsText, DsTrialToggle, type DsPlan } from '@amaya/ui'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { PLUS_TEXTS, resolveSegment, type PlusConfig, type PlusSwitchProducts, type PlusTrioProducts, type ScreenProps } from '../config'
import { usePaywall } from '../usePaywall'

const props = defineProps<ScreenProps & { config: PlusConfig }>()

const { t } = useI18n()
const tx = computed(() => ({ ...PLUS_TEXTS, ...props.config.texts }))
const days = computed(() => props.config.trialDays)

const paywall = usePaywall({
  env: props.env,
  required: () => requiredProducts(),
  waitFor: ['art'],
  forcePurchasing: () => props.forcePurchasing
})
const { opened, session, wasTrial, busy, purchasing } = paywall

const products = computed(() => resolveSegment<PlusSwitchProducts | PlusTrioProducts>(
  props.config.segments, paywall.data.value?.variant, props.config.defaultSegment))

function requiredProducts(): string[] {
  if (props.config.mode === 'trio') {
    const p = products.value as PlusTrioProducts
    return [p.week, p.month, p.year]
  }
  const p = products.value as PlusSwitchProducts
  return wasTrial.value ? [p.yearNoTrial, p.weekNoTrial] : [p.yearNoTrial, p.weekNoTrial, p.weekTrial]
}

const price = (id: string) => paywall.price(id) ?? ''

// Выбор тарифа и тумблер триала; при повторном открытии — как в первый раз
const selected = ref(0)
const trialMode = ref(false)
watch(selected, (index) => {
  if (index !== 1) trialMode.value = false
})
watch(session, () => {
  selected.value = 0
  trialMode.value = false
})
const setTrial = (on: boolean) => {
  trialMode.value = on
  if (on) selected.value = 1
}

const plans = computed<DsPlan[]>(() => {
  const x = tx.value
  if (props.config.mode === 'trio') {
    const p = products.value as PlusTrioProducts
    return [
      { key: p.week, title: t(x.weekly), price: price(p.week), period: t(x.perWeek), tint: 'sky', emphasis: true },
      { key: p.month, title: t(x.monthly), price: price(p.month), period: t(x.perMonth), tint: 'violet', emphasis: true },
      { key: p.year, title: t(x.yearly), price: price(p.year), period: t(x.perYear), tint: 'pink', emphasis: true }
    ]
  }
  const p = products.value as PlusSwitchProducts
  const year = price(p.yearNoTrial)
  const list: DsPlan[] = [{
    key: p.yearNoTrial,
    title: t(x.yearlyAccess),
    subtitle: t(x.justPerYear, { price: year }),
    price: perWeek(year, 'year') ?? '',
    period: t(x.perWeek),
    badge: t(x.bestOffer)
  }]
  list.push(trialMode.value && !wasTrial.value
    ? { key: p.weekTrial, title: t(x.daysFree, { days: days.value }, days.value), price: price(p.weekTrial), period: t(x.perWeek), emphasis: true }
    : { key: p.weekNoTrial, title: t(x.weeklyAccess), price: price(p.weekNoTrial), period: t(x.perWeek) })
  return list
})

const selectedPlan = computed(() => plans.value[selected.value] ?? plans.value[0])
const isTrialPlan = computed(() => props.config.mode === 'switch' && selectedPlan.value?.key === (products.value as PlusSwitchProducts).weekTrial)

const title = computed(() => {
  const x = tx.value
  if (props.config.mode === 'switch') return t(x.titleUnlimited)
  return wasTrial.value
    ? t(x.titleUnlimitedApps, { count: props.config.appsCount })
    : t(x.titleAnyPlanFree, { days: days.value }, days.value)
})

const buttonText = computed(() => t(isTrialPlan.value ? tx.value.tryFree : tx.value.continue))

// Под кнопкой: On start — «No payment now» с триалом, иначе «Cancel anytime»; On click — условия триала и про Amaya Plus
const notes = computed(() => {
  const x = tx.value
  if (props.config.mode === 'switch') return [t(trialMode.value ? x.noPaymentNow : x.cancelAnytime)]
  const lines: string[] = []
  if (!wasTrial.value && selectedPlan.value) {
    const key = [x.thenPerWeek, x.thenPerMonth, x.thenPerYear][selected.value] ?? x.thenPerWeek
    lines.push(t(key, { days: days.value, price: selectedPlan.value.price ?? '' }, days.value))
  }
  lines.push(t(x.fullAccess))
  return lines
})

const features = computed(() => tx.value.features.map(key => t(key, { count: props.config.appsCount })))

const SLIDE_BG = {
  sky: 'ds:bg-slide-sky',
  lime: 'ds:bg-slide-lime',
  yellow: 'ds:bg-slide-yellow',
  periwinkle: 'ds:bg-slide-periwinkle',
  lilac: 'ds:bg-slide-lilac'
}

// Аналитика как у InApp: при открытии — показан первый слайд (mixpanelEventInappScroll)
watch(session, () => paywall.track('inapp_scroll', { page_number: 1 }))

// До первого открытия экран уже нарисован (грузятся арт и шрифт), после закрытия — прячется
const shown = computed(() => opened.value || session.value === 0)

const buy = () => {
  if (selectedPlan.value) paywall.purchase(selectedPlan.value.key)
}
</script>

<template>
  <DsRoot
    :theme="theme ?? config.theme"
    :lang="paywall.data.value?.locale"
    class="pw-plus ds:relative ds:flex ds:h-vh ds:w-full ds:overflow-hidden ds:bg-bg-screen ds:no-select ds:transition-opacity ds:duration-(--ds-duration-base)"
    :class="shown ? 'ds:opacity-100' : 'ds:pointer-events-none ds:opacity-0'"
    :data-mode="config.mode"
  >
    <!-- Слайды Amaya Plus -->
    <section class="pw-plus__hero ds:relative ds:flex ds:min-w-0 ds:flex-col ds:overflow-hidden ds:rounded-e-hero">
      <DsSlides
        class="ds:h-full"
        :count="config.slides.length"
        :playing="opened"
        :reset-key="session"
        :dot-label="(index: number) => t(tx.slide, { number: index + 1 })"
        dots-overlay
      >
        <template #slide="{ index }">
          <div
            class="ds:flex ds:h-full ds:flex-col ds:items-center ds:px-8 ds:pb-9 ds:pt-10"
            :class="SLIDE_BG[config.slides[index]!.bg]"
          >
            <DsText
              as="h2"
              variant="title-md"
              align="center"
            >
              {{ t(config.slides[index]!.title, { count: config.appsCount }) }}
            </DsText>
            <DsText
              class="ds:mt-1"
              align="center"
            >
              {{ t(config.slides[index]!.text) }}
            </DsText>
            <DsImage
              class="ds:mt-3 ds:min-h-0 ds:w-full ds:flex-1"
              :set="config.slides[index]!.art"
              alt=""
              :loading="index === 0 ? 'eager' : 'lazy'"
              :priority="index === 0 ? 'high' : 'auto'"
              @load="index === 0 && paywall.markLoaded('art')"
              @error="index === 0 && paywall.markLoaded('art')"
            />
          </div>
        </template>
      </DsSlides>

      <div class="ds:absolute ds:start-0 ds:top-0 ds:flex ds:rounded-ee-card ds:bg-bg-card ds:px-6 ds:py-1.5">
        <DsImage
          class="ds:h-4"
          :src="config.logo"
          :alt="t(tx.logo)"
          size="intrinsic"
        />
      </div>
    </section>

    <!-- Заголовок, тарифы, кнопка, документы -->
    <!-- Не помещается по высоте (iPhone SE в альбомной) — уменьшается целиком, а не обрезается -->
    <DsFit class="pw-plus__content ds:min-w-0">
      <section class="ds:relative ds:flex ds:h-full ds:flex-col ds:items-center ds:justify-between ds:px-5 ds:pb-3 ds:pt-4 ds:medium:px-8">
        <DsText
          as="h1"
          variant="title-lg"
          align="center"
          class="ds:px-4"
        >
          {{ title }}
        </DsText>

        <div class="ds:flex ds:w-full ds:max-w-80 ds:flex-col">
          <DsBenefitList
            v-if="config.mode === 'switch'"
            class="ds:mb-2"
            :items="features"
          />
          <DsTrialToggle
            v-if="config.mode === 'switch' && !wasTrial"
            class="ds:mb-2"
            :model-value="trialMode"
            :label="t(tx.freeTrial)"
            :disabled="busy"
            @update:model-value="setTrial"
          />
          <DsPlanPicker
            v-model="selected"
            :class="config.mode === 'trio' ? 'ds:px-4' : ''"
            :plans="plans"
            :label="t(tx.plans)"
            :disabled="busy"
          />
          <DsButton
            data-pw="cta"
            class="ds:mt-2"
            :class="config.mode === 'trio' ? 'ds:mx-4' : ''"
            block
            :loading="!!purchasing || forcePurchasing"
            :loading-label="buttonText"
            @click="buy"
          >
            {{ buttonText }}
          </DsButton>
          <DsText
            v-for="(line, index) in notes"
            :key="index"
            :class="index === 0 ? 'ds:mt-1' : ''"
            variant="caption"
            :tone="config.mode === 'trio' ? 'secondary' : 'muted'"
            align="center"
          >
            {{ line }}
          </DsText>
        </div>

        <DsLegalLinks
          tone="muted"
          :terms="t(tx.terms)"
          :restore="t(tx.restore)"
          @terms="paywall.openLegal('terms')"
          @restore="paywall.restore()"
        />
      </section>
    </DsFit>

    <div class="ds:absolute ds:end-2 ds:top-2">
      <DsCloseButton
        data-pw="close"
        :label="t(tx.close)"
        :active="opened"
        @close="paywall.close()"
      />
    </div>
  </DsRoot>
</template>

<style scoped>
/* Две половины в альбомной; в портретной — слайды сверху (40 % высоты), тарифы снизу */
.pw-plus__hero,
.pw-plus__content {
  width: 50%;
}

@media (orientation: portrait) {
  .pw-plus {
    flex-direction: column;
  }

  .pw-plus__hero {
    width: 100%;
    height: 40%;
    border-radius: 0 0 var(--ds-radius-hero) var(--ds-radius-hero);
  }

  .pw-plus__content {
    width: 100%;
    flex: 1;
  }
}
</style>
