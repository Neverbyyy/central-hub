<script setup lang="ts">
// Часть шаблона PwHeroSlider: попап «More Plans». Какие тарифы показать и что купить, решает шаблон
import { DsButton, DsCloseButton, DsFit, DsGameTitle, DsImage, DsPlanPicker, DsPopup, type DsPlan } from '@amaya/ui'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { HeroSliderConfig } from '../../config'

defineProps<{
  config: HeroSliderConfig
  open: boolean
  plans: DsPlan[]
  selected: number
  buttonText: string
  busy: boolean
  loading: boolean
}>()

const emit = defineEmits<{
  'update:selected': [index: number]
  'close': []
  'buy': []
}>()

const { t } = useI18n()

// Для DsFit: естественная высота попапа вместе с роботом над ним
const sheet = ref<HTMLElement | null>(null)
const height = () => sheet.value?.offsetHeight ?? 0
</script>

<template>
  <DsPopup
    :open="open"
    :label="t(config.texts.plans)"
    @close="emit('close')"
  >
    <!-- Попап прижат к низу и тоже уменьшается целиком, если выше экрана (iPhone SE в альбомной).
         Пустой верх не ловит касания — тап по затемнению закрывает попап -->
    <div class="ds:pointer-events-none ds:h-vh">
      <DsFit
        class="ds:size-full"
        :measure="height"
      >
        <div class="ds:flex ds:h-full ds:flex-col ds:justify-end">
          <div
            ref="sheet"
            class="ds:pointer-events-auto ds:relative ds:pt-popup-art-rise"
          >
            <!-- Робот сидит на краю попапа: размер и подъём — токены, а не доля экрана, поэтому на любом экране он
                 заходит на попап одинаково и не задевает заголовок -->
            <DsImage
              class="ds:pointer-events-none ds:absolute ds:start-1/2 ds:top-0 ds:z-10 ds:w-popup-art-w ds:-translate-x-1/2"
              :set="config.art.popup.top"
              alt=""
            />
            <div class="pw-plans__sheet ds:relative ds:overflow-hidden ds:rounded-t-hero">
              <DsImage
                class="ds:absolute ds:inset-0"
                :set="config.art.popup.bg"
                alt=""
                fit="cover"
              />
              <DsImage
                class="pw-plans__left ds:pointer-events-none ds:absolute ds:bottom-0 ds:start-0"
                :set="config.art.popup.left"
                alt=""
              />
              <DsImage
                class="pw-plans__right ds:pointer-events-none ds:absolute ds:bottom-0 ds:end-0"
                :set="config.art.popup.right"
                alt=""
              />
              <DsImage
                class="pw-plans__balloon ds:pointer-events-none ds:absolute ds:start-0"
                :set="config.art.popup.balloon"
                alt=""
              />
              <DsImage
                class="pw-plans__key ds:pointer-events-none ds:absolute ds:end-0"
                :set="config.art.popup.key"
                alt=""
              />

              <div class="ds:relative ds:flex ds:flex-col ds:items-center ds:px-6 ds:pb-8 ds:pt-popup-top">
                <DsGameTitle variant="title-lg">
                  <em>{{ t(config.texts.titleLead) }}</em>
                  {{ ' ' }}
                  <i18n-t
                    :keypath="config.texts.titleAnd"
                    tag="span"
                    scope="global"
                  >
                    <template #apps>
                      <em>{{ t(config.texts.titleApps, { count: config.appsCount }) }}</em>
                    </template>
                  </i18n-t>
                </DsGameTitle>
                <DsGameTitle
                  as="p"
                  variant="title-md"
                >
                  {{ t(config.texts.titleTail) }}
                </DsGameTitle>

                <DsPlanPicker
                  class="ds:mt-4"
                  :model-value="selected"
                  :plans="plans"
                  direction="row"
                  layout="stack"
                  indicator="radio"
                  :label="t(config.texts.plans)"
                  :disabled="busy"
                  @update:model-value="emit('update:selected', $event)"
                />
                <DsButton
                  class="ds:mt-4"
                  :loading="loading"
                  :loading-label="buttonText"
                  @click="emit('buy')"
                >
                  {{ buttonText }}
                </DsButton>
              </div>
              <div class="ds:absolute ds:end-1.5 ds:top-4 ds:large:end-6 ds:large:top-7">
                <DsCloseButton
                  tone="alt"
                  :label="t(config.texts.close)"
                  :delay="0"
                  @close="emit('close')"
                />
              </div>
            </div>
          </div>
        </div>
      </DsFit>
    </div>
  </DsPopup>
</template>

<style scoped>
/* Светлая кромка и цветная полоса сверху — слоем поверх фоновой картинки */
.pw-plans__sheet::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: inset 0 0.375rem 0 var(--ds-color-popup-rim), inset 0 0.75rem 0 var(--ds-color-popup-edge);
  pointer-events: none;
}

.pw-plans__left {
  width: 31%;
}

.pw-plans__right {
  width: 27%;
}

.pw-plans__balloon {
  top: 22%;
  width: 16%;
}

.pw-plans__key {
  top: 34%;
  width: 8%;
}
</style>
