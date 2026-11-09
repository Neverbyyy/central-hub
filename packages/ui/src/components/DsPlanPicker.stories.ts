import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { computed, ref } from 'vue'
import { babycarePlans, cars2Plans, farmSwitchPlans, farmTrioPlans, useStoryTexts, NO_SCREEN_STATE } from '../stories'
import type { DsPlan } from '../types'
import DsCarousel from './DsCarousel.vue'
import DsPlanPicker from './DsPlanPicker.vue'

// Выбор тарифа — общий для обоих пейволлов; каждая история показана в теме своей игры. Тарифы — из stories/demo.ts
const meta = {
  title: 'Общее/Выбор тарифа',
  component: DsPlanPicker,
  args: { plans: [], modelValue: 0, disabled: false },
  argTypes: {
    plans: { table: { disable: true } },
    modelValue: { table: { disable: true } },
    disabled: { name: 'Идёт покупка', control: 'boolean' }
  },
  globals: NO_SCREEN_STATE
} satisfies Meta<typeof DsPlanPicker>

export default meta
type Story = StoryObj<typeof meta>
type Plans = (t: ReturnType<typeof useStoryTexts>['t']) => DsPlan[]

// surface — фон под карточками, как на экране: у Baby Care белые полупрозрачные карточки на голубом градиенте
const picker = (theme: string, build: Plans, props: Record<string, string>, width: string, wrap = 'div', surface = ''): Story => ({
  globals: { theme },
  render: (args: { disabled?: boolean }) => ({
    components: { DsCarousel, DsPlanPicker },
    setup() {
      const { t } = useStoryTexts()
      const selected = ref(0)
      const plans = computed(() => build(t))
      return { args, selected, plans, props, width, wrap, surface }
    },
    template: `
      <div class="ds:p-6" :class="surface" :style="{ maxWidth: width }">
        <component :is="wrap"><DsPlanPicker v-model="selected" :plans="plans" v-bind="props" :disabled="args.disabled" label="plans" data-testid="picker" /></component>
        <p class="sb-note">Выбран: <b data-testid="selected">{{ selected }}</b>. Стрелки — как у радиокнопок, Tab — только в выбранную карточку</p>
      </div>
    `
  })
})

export const Switch: Story = { name: 'Farm · On start: год и неделя', ...picker('farm', farmSwitchPlans, {}, '360px') }

export const Trio: Story = { name: 'Farm · On click: три тарифа своими цветами', ...picker('farm', farmTrioPlans, {}, '320px') }

// Круг с галочкой у выбранного, текст невыбранного приглушён (color.plan.text) — пейволл Baby Care
export const Check: Story = {
  name: 'Baby Care: галочка, невыбранный приглушён',
  ...picker('babycare', babycarePlans, { indicator: 'check' }, '320px', 'div', 'ds:surface-screen')
}

// Попап тарифов Cars 2 — во всю ширину телефона в альбомной (844): уже карточки в ряд не помещаются
export const Row: Story = {
  name: 'Cars 2 · попап: в ряд с радиокнопками',
  ...picker('cars2', cars2Plans, { direction: 'row', layout: 'stack', indicator: 'radio' }, '760px')
}

// Телефон в портрете: ряд шире экрана листается пальцем, карточка, которой коснулись, выезжает к центру
export const RowScroll: Story = {
  name: 'Cars 2 · попап: ряд шире экрана',
  ...picker('cars2', cars2Plans, { direction: 'row', layout: 'stack', indicator: 'radio' }, '375px', 'DsCarousel')
}
