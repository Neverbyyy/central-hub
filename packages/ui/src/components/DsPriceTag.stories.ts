import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import { DEMO_PRICES, TAGS, useStoryTexts, NO_SCREEN_STATE } from '../stories'
import DsBadge from './DsBadge.vue'
import DsBenefitList from './DsBenefitList.vue'
import DsBox from './DsBox.vue'
import DsCheckMark from './DsCheckMark.vue'
import DsIconButton from './DsIconButton.vue'
import DsPriceTag from './DsPriceTag.vue'
import DsText from './DsText.vue'

const meta = {
  title: 'Cars 2/Главная карточка',
  component: DsPriceTag,
  globals: { theme: 'cars2', ...NO_SCREEN_STATE }
} satisfies Meta<typeof DsPriceTag>

export default meta

// Детали главной карточки Cars 2: цена в неделю на плашке, кнопка «i» и карточки оборота «что входит в подписку»
export const Parts: StoryObj = {
  name: 'Главная карточка',
  args: { price: '' },
  render: () => ({
    components: { DsPriceTag, DsIconButton, DsBox, DsCheckMark, DsBenefitList, DsBadge, DsText },
    setup() {
      const info = ref(0)
      return { info, prices: DEMO_PRICES.cars2, TAGS, ...useStoryTexts() }
    },
    template: `
      <div class="ds:bg-bg-hero ds:p-6">
        <div class="ds:flex ds:items-center" style="gap: 24px">
          <DsPriceTag :price="t('common.price.per_week', { price: prices.yearTrialWeek })" :sub="t('common.price.just_per_year', { price: prices.yearTrial })" />
          <DsIconButton icon="info" :label="t('common.button.whats_included')" data-testid="info" @click="info++" />
          <span class="sb-note">«i» нажата: <b data-testid="info-count">{{ info }}</b></span>
        </div>
        <div class="ds:mt-6 ds:flex ds:items-stretch" style="max-width: 420px">
          <DsBox surface="card" :padding="3" class="ds:relative ds:me-1 ds:w-1/3 ds:shrink-0">
            <DsCheckMark class="ds:absolute ds:end-2 ds:top-2" />
            <DsText variant="list" class="ds:mt-6 ds:font-extrabold">{{ t('app.cars2.paywall.info.cars') }}</DsText>
            <DsBenefitList class="ds:mt-1" marker="check" tone="primary" :items="[t('common.benefit.no_ads'), t('common.benefit.no_extra_payments')]" />
          </DsBox>
          <DsBox surface="card" :padding="3" class="ds:relative ds:min-w-0 ds:flex-1">
            <DsCheckMark class="ds:absolute ds:end-2 ds:top-2" />
            <DsText variant="list" class="ds:mt-6 ds:font-extrabold">{{ t('common.plus.info.apps', { count: 20 }) }}</DsText>
            <div class="ds:mt-1.5 ds:flex ds:flex-wrap">
              <DsBadge v-for="tag in TAGS" :key="tag.key" :tone="tag.tone" class="ds:mb-0.5 ds:me-0.5">{{ t(tag.key) }}</DsBadge>
            </div>
          </DsBox>
        </div>
      </div>
    `
  })
}
