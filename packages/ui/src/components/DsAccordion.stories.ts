import type { StoryObj } from '@storybook/vue3-vite'
import { computed, ref } from 'vue'
import { useStoryTexts } from '../stories'
import DsAccordion from './DsAccordion.vue'

// FAQ лендинга: вопросы — кнопки, ↑/↓/Home/End между ними; тексты — ключи лендинга Cars 2
export default {
  title: 'Блоки лендинга/FAQ',
  component: DsAccordion
}

export const Faq: StoryObj = {
  name: 'FAQ',
  render: () => ({
    components: { DsAccordion },
    setup() {
      const { t } = useStoryTexts()
      const opened = ref<string[]>([])
      const items = computed(() => [1, 2, 3, 4, 5].map(n => ({ id: `q${n}`, question: t(`web.lp_cars2.faq.item_${n}.question`), answer: t(`web.lp_cars2.faq.item_${n}.answer`) })))
      const onToggle = (id: string, open: boolean) => {
        opened.value = open ? [...opened.value, id] : opened.value.filter(item => item !== id)
      }
      return { items, opened, onToggle }
    },
    template: `
      <div style="max-width: 640px">
        <div class="ds:bg-lp-section ds:p-6">
          <DsAccordion id="faq" :items="items" :default-open="['q1']" data-testid="faq" @toggle="onToggle" />
        </div>
        <p class="sb-note">Открыты после нажатий: <b data-testid="opened">{{ opened.join(', ') || '—' }}</b></p>
      </div>
    `
  })
}
