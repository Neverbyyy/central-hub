// Автомойка лендинга: DsWipe с артом Cars 2 — машина под грязью, чистая и снова грязная. Арт из лендинга, поэтому история
// здесь, а не рядом с компонентом
import { DsWipe } from '@amaya/ui'
import { NO_SCREEN_STATE, NO_THEME, useStoryTexts } from '@amaya/ui/stories'
import type { StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import { LANDINGS } from '../../landings/app/landings'

export default {
  title: 'Блоки лендинга/Автомойка',
  globals: { ...NO_THEME, ...NO_SCREEN_STATE }
}

const wash = LANDINGS['cars2-go']!.road!.wash

// Проведите мышью или пальцем; Enter и пробел моют сразу
export const Wipe: StoryObj = {
  name: 'Автомойка',
  render: () => ({
    components: { DsWipe },
    setup() {
      const round = ref(0)
      const log = ref('')
      return { wash, round, log, ...useStoryTexts() }
    },
    template: `
      <div class="ds:p-6" style="max-width: 320px">
        <DsWipe
          :set="wash.art"
          :ratio="wash.ratio"
          :label="t(wash.label)"
          :reset-key="round"
          data-testid="wipe"
          @done="log = 'чисто'"
        />
        <p class="sb-note">Событие done: <b data-testid="state">{{ log || '—' }}</b></p>
        <button type="button" data-testid="again" @click="round++; log = ''">Испачкать снова</button>
      </div>
    `
  })
}
