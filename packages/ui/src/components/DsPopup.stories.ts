import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { computed, ref } from 'vue'
import { cars2Plans, useStoryTexts, NO_SCREEN_STATE } from '../stories'
import DsButton from './DsButton.vue'
import DsCloseButton from './DsCloseButton.vue'
import DsGameTitle from './DsGameTitle.vue'
import DsPlanPicker from './DsPlanPicker.vue'
import DsPopup from './DsPopup.vue'

const meta = {
  title: 'Cars 2/Попап тарифов',
  component: DsPopup,
  args: { open: false },
  globals: { theme: 'cars2', ...NO_SCREEN_STATE }
} satisfies Meta<typeof DsPopup>

export default meta

// «More plans»: попап выезжает снизу, закрывается крестиком, касанием затемнения и Esc. Тарифы — из stories/demo.ts
export const Popup: StoryObj<typeof meta> = {
  name: 'Попап тарифов',
  render: () => ({
    components: { DsPopup, DsButton, DsCloseButton, DsGameTitle, DsPlanPicker },
    setup() {
      const { t } = useStoryTexts()
      const open = ref(false)
      const selected = ref(0)
      const plans = computed(() => cars2Plans(t))
      return { open, selected, plans, t }
    },
    template: `
      <div class="ds:relative ds:p-6" style="height: 390px; overflow: hidden">
        <DsButton data-testid="open" @click="open = true">{{ t('common.link.more_plans') }}</DsButton>
        <DsPopup :open="open" :label="t('common.plan.group_label')" @close="open = false">
          <div class="ds:relative ds:flex ds:flex-col ds:items-center ds:rounded-t-hero ds:bg-bg-hero ds:px-6 ds:pb-6 ds:pt-4" data-testid="sheet">
            <DsGameTitle variant="title-lg"><em>{{ t('app.cars2.paywall.title.all_cars') }}</em></DsGameTitle>
            <DsGameTitle variant="title-md" as="p">{{ t('app.cars2.paywall.title.subscription') }}</DsGameTitle>
            <DsPlanPicker v-model="selected" class="ds:mt-3" :plans="plans" direction="row" layout="stack" indicator="radio" :label="t('common.plan.group_label')" />
            <DsButton class="ds:mt-3">{{ t('common.button.try_free') }}</DsButton>
            <div class="ds:absolute ds:end-2 ds:top-2">
              <DsCloseButton tone="alt" :delay="0" :label="t('ds.close_button.aria.label')" @close="open = false" />
            </div>
          </div>
        </DsPopup>
      </div>
    `
  })
}
