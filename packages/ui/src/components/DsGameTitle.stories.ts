import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { useStoryTexts, NO_SCREEN_STATE } from '../stories'
import DsGameTitle from './DsGameTitle.vue'

const meta = {
  title: 'Cars 2/Заголовок с обводкой',
  component: DsGameTitle,
  globals: { theme: 'cars2', ...NO_SCREEN_STATE }
} satisfies Meta<typeof DsGameTitle>

export default meta

// Заголовок главной карточки (display-*) и попапа тарифов (title-*): белая обводка, выделенные слова — <em> цветом акцента.
// Подложка color.bg.hero — светлое небо, как арт за заголовком: на ней видна обводка
export const Default: StoryObj = {
  name: 'Заголовок с обводкой',
  render: () => ({
    components: { DsGameTitle },
    setup: () => useStoryTexts(),
    template: `
      <div class="ds:bg-bg-hero ds:p-6" style="max-width: 520px">
        <DsGameTitle variant="display-lg" data-testid="game-display"><em>{{ t('app.cars2.paywall.title.all_cars') }}</em></DsGameTitle>
        <DsGameTitle variant="display-md" as="p">
          <i18n-t keypath="app.cars2.paywall.title.and_apps" tag="span" scope="global">
            <template #apps><em>{{ t('app.cars2.paywall.title.apps', { count: 20 }) }}</em></template>
          </i18n-t>
        </DsGameTitle>
        <DsGameTitle variant="display-md" as="p">{{ t('app.cars2.paywall.title.subscription') }}</DsGameTitle>
        <DsGameTitle class="ds:mt-6" data-testid="game-title"><em>{{ t('app.cars2.paywall.title.all_cars') }}</em> {{ t('app.cars2.paywall.title.subscription') }}</DsGameTitle>
      </div>
    `
  })
}
