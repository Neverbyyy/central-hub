import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { APPS_COUNT, FEATURE_KEYS, TAGS, useStoryTexts } from '../stories'
import DsBadge from './DsBadge.vue'
import DsBenefitList from './DsBenefitList.vue'

const meta = {
  title: 'Общее/Плашки и списки',
  component: DsBadge
} satisfies Meta<typeof DsBadge>

export default meta

// Плашка «Best offer» (Farm) и цветные метки жанров (Cars 2); список преимуществ с точками (Farm) и галочками (Cars 2)
export const All: StoryObj = {
  name: 'Плашки и списки',
  render: () => ({
    components: { DsBadge, DsBenefitList },
    setup: () => ({ TAGS, FEATURE_KEYS, APPS_COUNT, ...useStoryTexts() }),
    template: `
      <div class="ds:flex ds:flex-wrap ds:items-start ds:p-6" style="gap: 32px">
        <DsBadge>{{ t('common.badge.best_offer') }}</DsBadge>
        <div class="ds:flex ds:flex-wrap" style="max-width: 260px; gap: 4px">
          <DsBadge v-for="tag in TAGS" :key="tag.key" :tone="tag.tone">{{ t(tag.key) }}</DsBadge>
        </div>
        <DsBenefitList style="max-width: 220px" :items="FEATURE_KEYS.map(key => t(key, { count: APPS_COUNT }))" />
        <DsBenefitList style="max-width: 220px" marker="check" tone="primary" :items="[t('common.benefit.no_ads'), t('common.benefit.no_extra_payments')]" />
      </div>
    `
  })
}
