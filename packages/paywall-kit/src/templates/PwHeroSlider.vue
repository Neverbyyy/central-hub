<script setup lang="ts">
/**
 * Шаблон пейволла «главная карточка и карусель наборов» (Cars 2; повторяет InApp cars2 tm11 pw-slider, вариант B).
 * - Главная карточка: заголовок игры, цена в неделю на плашке и цена за год; касание карточки или кнопки —
 *   покупка года (с триалом, если его ещё не было). «i» переворачивает карточку: что входит в подписку.
 * - «More Plans» — попап снизу с тремя тарифами (год с триалом, год, неделя с триалом).
 * - Справа — наборы машин разовой покупкой; если подписка уже есть или куплено всё — только главная карточка.
 * Логика экрана — usePaywall; тексты — ключи сервиса из конфига; цены — из стора.
 */
import { perWeek } from '@amaya/pricing'
import { DsBox, DsButton, DsCarousel, DsCheckMark, DsCloseButton, DsFit, DsGameTitle, DsIconButton, DsImage, DsLink, DsPlanPicker, DsPopup, DsPriceTag, DsRive, DsRoot, DsText, DsBenefitList, DsBadge, type DsPlan, type DsTheme } from '@amaya/ui'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { resolveSegment, type HeroSliderConfig, type HeroUnlock } from '../config'
import type { PaywallEnv } from '../env'
import { usePaywall } from '../usePaywall'

const props = withDefaults(defineProps<{
  env: PaywallEnv
  config: HeroSliderConfig
  theme?: DsTheme
  forcePurchasing?: boolean
}>(), {
  theme: undefined,
  forcePurchasing: false
})

const { t } = useI18n()
const tx = computed(() => props.config.texts)
const days = computed(() => props.config.trialDays)

const paywall = usePaywall({
  env: props.env,
  required: () => requiredProducts(),
  waitFor: ['art'],
  // Как в InApp: экран уходит, и через 300 мс — «закрыть»
  closeDelay: 300,
  forcePurchasing: () => props.forcePurchasing
})
const { opened, session, wasTrial, busy, purchasing } = paywall

const products = computed(() => resolveSegment(props.config.segments, paywall.data.value?.variant, props.config.defaultSegment))
const price = (id: string | undefined) => (id ? paywall.price(id) ?? '' : '')

// Главная покупка — год: с триалом, если его не было (InApp tm11, вариант B)
const yearKey = computed(() => (wasTrial.value ? products.value.yearNoTrial : products.value.yearTrial))
const yearPrice = computed(() => price(yearKey.value))

function requiredProducts(): string[] {
  const p = products.value
  return [yearKey.value, p.yearNoTrial, p.weekTrial]
}

const pricePill = computed(() => t(tx.value.pricePerWeek, { price: perWeek(yearPrice.value, 'year') ?? '' }))
const priceSub = computed(() => t(wasTrial.value ? tx.value.pricePerYear : tx.value.justPerYear, { price: yearPrice.value }))
const mainButton = computed(() => (wasTrial.value
  ? t(tx.value.unlockFor, { price: yearPrice.value })
  : t(tx.value.tryFreeDays, { days: days.value }, days.value)))

// Наборы машин: прячем купленные; при подписке или если куплено всё — карусели нет
const unlockId = (unlock: HeroUnlock) => products.value.unlocks[unlock.key]
const isOwned = (unlock: HeroUnlock) => {
  const id = unlockId(unlock)
  return (!!id && paywall.owns(id)) || (unlock.sameProducts ?? []).some(paywall.owns)
}
const onlyMain = computed(() => props.config.subscriptions.some(paywall.owns) || props.config.unlocks.every(isOwned))
const unlocks = computed(() => (onlyMain.value ? [] : props.config.unlocks.filter(unlock => !isOwned(unlock) && !!price(unlockId(unlock)))))

// Оборот карточки и попап тарифов; при повторном открытии — как в первый раз
const infoOpen = ref(false)
const popupOpen = ref(false)
const popupSelected = ref(0)
watch(session, () => {
  infoOpen.value = false
  popupOpen.value = false
  popupSelected.value = 0
})

const popupPlans = computed<DsPlan[]>(() => {
  const x = tx.value
  const p = products.value
  const year = (id: string): DsPlan => ({
    key: id,
    title: t(x.planPerYear, { price: price(id) }),
    subtitle: t(x.justPerWeek, { price: perWeek(price(id), 'year') ?? '' })
  })
  const trialNote = wasTrial.value ? undefined : t(x.daysFree, { days: days.value }, days.value)
  const list: DsPlan[] = []
  if (!wasTrial.value) list.push({ ...year(p.yearTrial), note: trialNote })
  list.push(year(p.yearNoTrial))
  list.push({ key: p.weekTrial, title: t(x.planPerWeek, { price: price(p.weekTrial) }), note: trialNote })
  return list
})
const popupPlan = computed(() => popupPlans.value[popupSelected.value] ?? popupPlans.value[0])
const popupButton = computed(() => {
  const key = popupPlan.value?.key
  const trial = !wasTrial.value && (key === products.value.yearTrial || key === products.value.weekTrial)
  return t(trial ? tx.value.tryFree : tx.value.unlock)
})

const buyMain = () => paywall.purchase(yearKey.value)
const buyUnlock = (unlock: HeroUnlock) => {
  const id = unlockId(unlock)
  if (id) paywall.purchase(id)
}
const buyPopup = () => {
  if (popupPlan.value) paywall.purchase(popupPlan.value.key)
}

const TAG_TONES = ['green', 'red', 'purple', 'blue', 'yellow'] as const

// Сколько высоты нужно ряду в его размерах (для DsFit): колонка главной карточки — карточка, кнопка, «More plans» —
// плюс поле ряда сверху и немного воздуха снизу. Наборы машин ниже колонки, их высота не решает
const main = ref<HTMLElement | null>(null)
const neededHeight = () => {
  const column = main.value
  if (!column) return 0
  const row = column.parentElement
  const top = row ? Number.parseFloat(getComputedStyle(row).paddingTop) || 0 : 0
  return column.offsetHeight + top * 2
}
// Попап тарифов: его естественная высота вместе с роботом над ним
const sheet = ref<HTMLElement | null>(null)
const popupHeight = () => sheet.value?.offsetHeight ?? 0
</script>

<template>
  <DsRoot
    :theme="theme ?? config.theme"
    :lang="paywall.data.value?.locale"
    class="pw-hero ds:relative ds:h-vh ds:w-full ds:overflow-hidden ds:no-select"
    :data-opened="opened || undefined"
  >
    <!-- Затемнение над игрой -->
    <div
      class="ds:absolute ds:inset-0 ds:bg-bg-screen ds:transition-opacity ds:duration-(--ds-duration-base)"
      :class="opened ? 'ds:opacity-100' : 'ds:opacity-0'"
    />

    <!-- Ряд не помещается по высоте (iPhone SE в альбомной) — уменьшается целиком: карточка, кнопка, наборы -->
    <div class="ds:absolute ds:inset-0">
      <DsFit
        class="ds:size-full"
        :measure="neededHeight"
      >
        <DsCarousel
          class="pw-hero__row ds:relative ds:h-full ds:scroll-px-14 ds:px-14 ds:pt-4"
          :class="onlyMain ? 'ds:justify-center' : ''"
          :hint="!onlyMain"
          :reset-key="session"
        >
          <!-- Главная карточка и кнопка под ней -->
          <div
            ref="main"
            class="pw-hero__main ds:relative ds:flex ds:flex-col ds:items-center"
            :class="onlyMain ? '' : 'ds:me-14'"
          >
            <div
              class="pw-hero__card ds:relative ds:h-hero-h ds:w-hero-w ds:cursor-pointer"
              @click="buyMain"
            >
              <!-- Фон: лицевая сторона и оборот сменяются прозрачностью -->
              <div class="ds:absolute ds:inset-0 ds:overflow-hidden ds:rounded-card">
                <DsImage
                  class="ds:absolute ds:inset-0"
                  :set="config.art.front"
                  alt=""
                  fit="cover"
                  priority="high"
                  @load="paywall.markLoaded('art')"
                  @error="paywall.markLoaded('art')"
                />
                <!-- Живой арт: только пока экран открыт, на каждое открытие — заново (key), на обороте — пауза.
                     front под ним — постер: «готов» анимацию не ждёт, не загрузилась — остаётся картинка -->
                <div
                  v-if="config.art.live && opened"
                  :key="session"
                  class="ds:absolute ds:inset-0"
                >
                  <DsRive
                    class="ds:size-full"
                    :src="config.art.live.src"
                    :artboard="config.art.live.artboard"
                    :state-machine="config.art.live.stateMachine"
                    fit="cover"
                    :autoplay="!infoOpen"
                    alt=""
                  />
                </div>
                <DsImage
                  v-if="config.art.live?.overlay"
                  class="ds:absolute ds:inset-0"
                  :set="config.art.live.overlay"
                  alt=""
                  fit="cover"
                />
                <DsImage
                  class="ds:absolute ds:inset-0 ds:transition-opacity ds:duration-(--ds-duration-base)"
                  :class="infoOpen ? 'ds:opacity-100' : 'ds:opacity-0'"
                  :set="config.art.back"
                  alt=""
                  fit="cover"
                />
              </div>

              <div class="ds:relative ds:flex ds:h-full ds:flex-col ds:items-center ds:pt-3">
                <DsGameTitle variant="display-lg">
                  <em>{{ t(tx.titleLead) }}</em>
                </DsGameTitle>
                <DsGameTitle
                  as="p"
                  variant="display-md"
                >
                  <i18n-t
                    :keypath="tx.titleAnd"
                    tag="span"
                    scope="global"
                  >
                    <template #apps>
                      <em>{{ t(tx.titleApps, { count: config.appsCount }) }}</em>
                    </template>
                  </i18n-t>
                </DsGameTitle>
                <DsGameTitle
                  as="p"
                  variant="display-md"
                >
                  {{ t(tx.titleTail) }}
                </DsGameTitle>
                <DsPriceTag
                  class="ds:mt-2"
                  :price="pricePill"
                  :sub="priceSub"
                />

                <!-- Оборот: что входит в подписку -->
                <div
                  class="ds:mt-auto ds:flex ds:w-full ds:items-stretch ds:px-3 ds:pb-9 ds:transition-[opacity,translate] ds:duration-(--ds-duration-base) ds:ease-standard"
                  :class="infoOpen ? 'ds:opacity-100 ds:translate-y-0' : 'ds:pointer-events-none ds:opacity-0 ds:translate-y-4'"
                  :aria-hidden="!infoOpen || undefined"
                >
                  <DsBox
                    surface="card"
                    :padding="3"
                    class="ds:relative ds:me-1 ds:w-1/3 ds:shrink-0"
                  >
                    <DsCheckMark class="ds:absolute ds:end-2 ds:top-2" />
                    <DsImage
                      class="ds:mx-auto ds:size-8 ds:overflow-hidden ds:rounded-tag"
                      :set="config.art.gameIcon"
                      alt=""
                      loading="lazy"
                    />
                    <DsText
                      variant="list"
                      class="ds:mt-2 ds:font-extrabold"
                    >
                      {{ t(tx.infoCars) }}
                    </DsText>
                    <DsBenefitList
                      class="ds:mt-1"
                      marker="check"
                      tone="primary"
                      :items="[t(tx.infoNoAds), t(tx.infoNoPayments)]"
                    />
                  </DsBox>
                  <DsBox
                    surface="card"
                    :padding="3"
                    class="ds:relative ds:min-w-0 ds:flex-1"
                  >
                    <DsCheckMark class="ds:absolute ds:end-2 ds:top-2" />
                    <div class="ds:flex ds:items-center ds:justify-center ds:pe-4">
                      <DsImage
                        v-for="(icon, index) in config.art.appIcons"
                        :key="index"
                        class="ds:mx-0.5 ds:size-7 ds:overflow-hidden ds:rounded-tag"
                        :set="icon"
                        alt=""
                        loading="lazy"
                      />
                    </div>
                    <DsText
                      variant="list"
                      class="ds:mt-2 ds:font-extrabold"
                    >
                      {{ t(tx.infoApps, { count: config.appsCount }) }}
                    </DsText>
                    <DsText
                      variant="list"
                      class="ds:mt-1"
                    >
                      <i18n-t
                        :keypath="tx.infoAudience"
                        tag="span"
                        scope="global"
                      >
                        <template #boys>
                          <span class="ds:font-black ds:text-highlight-boys">{{ t(tx.infoBoys) }}</span>
                        </template>
                        <template #girls>
                          <span class="ds:font-black ds:text-highlight-girls">{{ t(tx.infoGirls) }}</span>
                        </template>
                      </i18n-t>
                    </DsText>
                    <div class="ds:mt-1.5 ds:flex ds:flex-wrap">
                      <DsBadge
                        v-for="(tag, index) in tx.tags"
                        :key="tag"
                        class="ds:mb-0.5 ds:me-0.5"
                        :tone="TAG_TONES[index % TAG_TONES.length]"
                      >
                        {{ t(tag) }}
                      </DsBadge>
                    </div>
                  </DsBox>
                </div>
              </div>

              <!-- Белая рамка поверх фона -->
              <div class="pw-hero__frame ds:pointer-events-none ds:absolute ds:inset-0 ds:rounded-card" />

              <DsImage
                class="pw-hero__balloons ds:pointer-events-none ds:absolute"
                :set="config.art.balloons"
                alt=""
              />

              <div
                class="ds:absolute ds:end-2 ds:top-2"
                @click.stop
              >
                <DsIconButton
                  v-if="!infoOpen"
                  icon="info"
                  :label="t(tx.info)"
                  :pressed-state="false"
                  @click="infoOpen = true"
                />
                <DsLink
                  v-else
                  tone="primary"
                  class="ds:font-body ds:text-link"
                  @click="infoOpen = false"
                >
                  {{ t(tx.back) }}
                </DsLink>
              </div>
            </div>

            <DsButton
              data-pw="cta"
              class="ds:-mt-6"
              shine
              :loading="purchasing === yearKey && !popupOpen || forcePurchasing"
              :disabled="busy && purchasing !== yearKey && !forcePurchasing"
              :loading-label="mainButton"
              @click="buyMain"
            >
              {{ mainButton }}
            </DsButton>
            <DsLink
              data-pw="more"
              tone="inverse"
              class="ds:mt-1 ds:font-link ds:text-link"
              @click="!busy && (popupOpen = true)"
            >
              {{ t(tx.morePlans) }}
            </DsLink>
          </div>

          <!-- Наборы машин разовой покупкой -->
          <div
            v-for="unlock in unlocks"
            :key="unlock.key"
            class="pw-hero__unlock ds:relative ds:me-6 ds:flex ds:cursor-pointer ds:flex-col ds:items-center"
            :data-unlock="unlock.key"
            @click="buyUnlock(unlock)"
          >
            <div class="ds:relative ds:h-unlock-h ds:w-unlock-w ds:overflow-hidden ds:rounded-hero">
              <DsImage
                class="ds:absolute ds:inset-0"
                :set="unlock.art"
                alt=""
                fit="cover"
                position="top"
                loading="lazy"
              />
              <div class="pw-hero__frame ds:pointer-events-none ds:absolute ds:inset-0 ds:rounded-hero" />
            </div>
            <DsButton
              class="ds:-mt-6"
              variant="secondary"
              size="sm"
              :loading="purchasing === unlockId(unlock)"
              :disabled="busy && purchasing !== unlockId(unlock)"
              @click.stop="buyUnlock(unlock)"
            >
              <i18n-t
                :keypath="tx.unlockFor"
                tag="span"
                scope="global"
              >
                <template #price>
                  <span class="ds:block">{{ price(unlockId(unlock)) }}</span>
                </template>
              </i18n-t>
            </DsButton>
          </div>
        </DsCarousel>
      </DsFit>
    </div>

    <!-- Документы по углам -->
    <div class="ds:absolute ds:bottom-1.5 ds:start-10 ds:font-link ds:text-legal">
      <DsLink @click="paywall.openLegal('terms')">
        {{ t(tx.terms) }}
      </DsLink>
    </div>
    <div class="ds:absolute ds:bottom-1.5 ds:end-10 ds:font-link ds:text-legal">
      <DsLink @click="paywall.restore()">
        {{ t(tx.restore) }}
      </DsLink>
    </div>

    <div class="ds:absolute ds:end-1.5 ds:top-1.5">
      <DsCloseButton
        data-pw="close"
        :label="t(tx.close)"
        :active="opened"
        @close="paywall.close()"
      />
    </div>

    <!-- Попап «More Plans» -->
    <DsPopup
      :open="popupOpen"
      :label="t(tx.plans)"
      @close="popupOpen = false"
    >
      <!-- Попап прижат к низу и тоже уменьшается целиком, если выше экрана (iPhone SE в альбомной).
           Пустой верх не ловит касания — тап по затемнению закрывает попап -->
      <div class="ds:pointer-events-none ds:h-vh">
        <DsFit
          class="ds:size-full"
          :measure="popupHeight"
        >
          <div class="ds:flex ds:h-full ds:flex-col ds:justify-end">
            <div
              ref="sheet"
              class="ds:pointer-events-auto ds:relative ds:pt-16"
            >
              <DsImage
                class="pw-hero__popup-top ds:pointer-events-none ds:absolute ds:start-1/2 ds:top-0 ds:z-10 ds:-translate-x-1/2"
                :set="config.art.popup.top"
                alt=""
              />
              <div class="pw-hero__sheet ds:relative ds:overflow-hidden ds:rounded-t-hero">
                <DsImage
                  class="ds:absolute ds:inset-0"
                  :set="config.art.popup.bg"
                  alt=""
                  fit="cover"
                />
                <DsImage
                  class="pw-hero__popup-left ds:pointer-events-none ds:absolute ds:bottom-0 ds:start-0"
                  :set="config.art.popup.left"
                  alt=""
                />
                <DsImage
                  class="pw-hero__popup-right ds:pointer-events-none ds:absolute ds:bottom-0 ds:end-0"
                  :set="config.art.popup.right"
                  alt=""
                />
                <DsImage
                  class="pw-hero__popup-balloon ds:pointer-events-none ds:absolute ds:start-0"
                  :set="config.art.popup.balloon"
                  alt=""
                />
                <DsImage
                  class="pw-hero__popup-key ds:pointer-events-none ds:absolute ds:end-0"
                  :set="config.art.popup.key"
                  alt=""
                />

                <div class="ds:relative ds:flex ds:flex-col ds:items-center ds:px-6 ds:pb-8 ds:pt-3">
                  <DsGameTitle variant="title-lg">
                    <em>{{ t(tx.titleLead) }}</em>
                    {{ ' ' }}
                    <i18n-t
                      :keypath="tx.titleAnd"
                      tag="span"
                      scope="global"
                    >
                      <template #apps>
                        <em>{{ t(tx.titleApps, { count: config.appsCount }) }}</em>
                      </template>
                    </i18n-t>
                  </DsGameTitle>
                  <DsGameTitle
                    as="p"
                    variant="title-md"
                  >
                    {{ t(tx.titleTail) }}
                  </DsGameTitle>

                  <DsPlanPicker
                    v-model="popupSelected"
                    class="ds:mt-4"
                    :plans="popupPlans"
                    direction="row"
                    layout="stack"
                    indicator="radio"
                    :label="t(tx.plans)"
                    :disabled="busy"
                  />
                  <DsButton
                    class="ds:mt-4"
                    :loading="popupOpen && !!purchasing"
                    :loading-label="popupButton"
                    @click="buyPopup"
                  >
                    {{ popupButton }}
                  </DsButton>
                </div>
              </div>
              <div class="ds:absolute ds:end-1.5 ds:top-18 ds:z-10">
                <DsCloseButton
                  tone="alt"
                  :label="t(tx.close)"
                  :delay="0"
                  @close="popupOpen = false"
                />
              </div>
            </div>
          </div>
        </DsFit>
      </div>
    </DsPopup>
  </DsRoot>
</template>

<style scoped>
/* Белая рамка карточек — тенью внутрь поверх фона: толщина line.hero, цвет как у рамки кнопки */
.pw-hero__frame {
  box-shadow: inset 0 0 0 var(--ds-line-hero) var(--ds-color-cta-border);
}

/* Вход экрана: карточки поднимаются и проявляются — только transform и opacity */
.pw-hero__row {
  opacity: 0;
  transform: translateY(1rem);
  transition: opacity var(--ds-duration-base) var(--ds-ease-standard), transform var(--ds-duration-base) var(--ds-ease-standard);
}

[data-opened] .pw-hero__row {
  opacity: 1;
  transform: none;
}

/* Шары над левым верхним углом карточки: размер от карточки, как в макете (117×224 при ширине 420) */
.pw-hero__balloons {
  left: -4%;
  top: -12%;
  width: 28%;
}

/* Попап: светлая кромка и цветная полоса сверху — слоем поверх фоновой картинки */
.pw-hero__sheet::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: inset 0 0.375rem 0 var(--ds-color-popup-rim), inset 0 0.75rem 0 var(--ds-color-popup-edge);
  pointer-events: none;
}

.pw-hero__popup-top {
  width: 14%;
}

.pw-hero__popup-left {
  width: 31%;
}

.pw-hero__popup-right {
  width: 27%;
}

.pw-hero__popup-balloon {
  top: 10%;
  width: 16%;
}

.pw-hero__popup-key {
  top: 25%;
  width: 8%;
}

@media (prefers-reduced-motion: reduce) {
  .pw-hero__row {
    transform: none;
  }
}
</style>
