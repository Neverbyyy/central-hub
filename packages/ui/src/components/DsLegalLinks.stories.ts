import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import { useStoryTexts, NO_SCREEN_STATE } from '../stories'
import DsLegalLinks from './DsLegalLinks.vue'

const meta = {
  title: 'Farm/Документы',
  component: DsLegalLinks,
  globals: { theme: 'farm', ...NO_SCREEN_STATE }
} satisfies Meta<typeof DsLegalLinks>

export default meta

// Строка документов внизу пейволла Farm: Terms и Restore. Компонент только отдаёт события — адрес и восстановление
// покупок решает экран. В Cars 2 ссылки стоят по углам экрана, там это две отдельные ссылки DsLink
export const Legal: StoryObj = {
  name: 'Документы',
  render: () => ({
    components: { DsLegalLinks },
    setup() {
      const last = ref('—')
      return { last, ...useStoryTexts() }
    },
    template: `
      <div class="ds:p-6" style="max-width: 360px">
        <DsLegalLinks
          tone="muted"
          :terms="t('common.link.terms_of_use')"
          :restore="t('common.button.restore')"
          data-testid="legal"
          @terms="last = 'terms'"
          @restore="last = 'restore'"
        />
        <p class="sb-note">Последнее событие: <b data-testid="legal-event">{{ last }}</b></p>
      </div>
    `
  })
}
