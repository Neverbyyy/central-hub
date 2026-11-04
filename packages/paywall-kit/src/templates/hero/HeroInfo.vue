<script setup lang="ts">
// Часть шаблона PwHeroSlider: оборот главной карточки — что входит в подписку. Логики нет, только показ
import { DsBadge, DsBenefitList, DsBox, DsCheckMark, DsImage, DsText } from '@amaya/ui'
import { useI18n } from 'vue-i18n'
import type { HeroSliderConfig } from '../../config'

defineProps<{
  config: HeroSliderConfig
  open: boolean
}>()

const { t } = useI18n()

const TAG_TONES = ['green', 'red', 'purple', 'blue', 'yellow'] as const
</script>

<template>
  <div
    class="ds:mt-auto ds:flex ds:w-full ds:items-stretch ds:px-3 ds:pb-9 ds:transition-[opacity,translate] ds:duration-(--ds-duration-base) ds:ease-standard"
    :class="open ? 'ds:opacity-100 ds:translate-y-0' : 'ds:pointer-events-none ds:opacity-0 ds:translate-y-4'"
    :aria-hidden="!open || undefined"
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
        {{ t(config.texts.infoCars) }}
      </DsText>
      <DsBenefitList
        class="ds:mt-1"
        marker="check"
        tone="primary"
        :items="[t(config.texts.infoNoAds), t(config.texts.infoNoPayments)]"
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
        {{ t(config.texts.infoApps, { count: config.appsCount }) }}
      </DsText>
      <DsText
        variant="list"
        class="ds:mt-1"
      >
        <i18n-t
          :keypath="config.texts.infoAudience"
          tag="span"
          scope="global"
        >
          <template #boys>
            <span class="ds:font-black ds:text-highlight-boys">{{ t(config.texts.infoBoys) }}</span>
          </template>
          <template #girls>
            <span class="ds:font-black ds:text-highlight-girls">{{ t(config.texts.infoGirls) }}</span>
          </template>
        </i18n-t>
      </DsText>
      <div class="ds:mt-1.5 ds:flex ds:flex-wrap">
        <DsBadge
          v-for="(tag, index) in config.texts.tags"
          :key="tag"
          class="ds:mb-0.5 ds:me-0.5"
          :tone="TAG_TONES[index % TAG_TONES.length]"
        >
          {{ t(tag) }}
        </DsBadge>
      </div>
    </DsBox>
  </div>
</template>
