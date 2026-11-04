import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import { useStoryTexts, NO_SCREEN_STATE } from '../stories'
import DsCloseButton from './DsCloseButton.vue'

const meta = {
  title: 'Общее/Крестик',
  component: DsCloseButton,
  // label история берёт из сервиса (ds.close_button.aria.label), поле в панели не нужно
  args: { active: true, delay: 3000, label: '' },
  argTypes: {
    active: { control: 'boolean' },
    delay: { control: { type: 'number', step: 500 } },
    label: { table: { disable: true } }
  },
  globals: NO_SCREEN_STATE
} satisfies Meta<typeof DsCloseButton>

export default meta

// active — экран показан; выключить и включить — крестик снова ждёт delay, как при повторном открытии экрана
export const Delay: StoryObj<typeof meta> = {
  name: 'Крестик',
  render: args => ({
    components: { DsCloseButton },
    setup() {
      const closes = ref(0)
      return { args, closes, ...useStoryTexts() }
    },
    template: `
      <div class="ds:relative ds:bg-accent ds:p-6" style="min-height: 160px">
        <DsCloseButton
          :label="t('ds.close_button.aria.label')"
          :active="args.active"
          :delay="args.delay"
          class="ds:absolute ds:top-4 ds:right-4"
          data-testid="close"
          @close="closes++"
        />
        <p class="sb-note" style="color: white">Закрытий: <b data-testid="closes">{{ closes }}</b></p>
      </div>
    `
  })
}
