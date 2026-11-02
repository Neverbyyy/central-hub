import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import { imageSet } from '../image'
import { DEMO_ART, DEMO_PRICES, GAME_BACKDROP, useStoryTexts } from '../stories'
import DsButton from './DsButton.vue'
import DsCarousel from './DsCarousel.vue'
import DsImage from './DsImage.vue'

const meta = {
  title: 'Cars 2/Карусель наборов',
  component: DsCarousel,
  globals: { theme: 'cars2' }
} satisfies Meta<typeof DsCarousel>

export default meta

// Наборы машин справа от главной карточки: ряд листается пальцем; при новом показе едет с середины к началу —
// видно, что его можно листать
export const Carousel: StoryObj = {
  name: 'Карусель наборов',
  render: () => ({
    components: { DsCarousel, DsImage, DsButton },
    setup() {
      const session = ref(0)
      return { session, art: imageSet(DEMO_ART), price: DEMO_PRICES.cars2.pack, game: GAME_BACKDROP, ...useStoryTexts() }
    },
    // Под каруселью — «игра» и затемнение темы, как в экране: на белом холсте белые кнопки не видны
    template: `
      <div>
        <div :style="{ background: game }">
          <div class="ds:bg-bg-screen ds:py-6">
            <DsCarousel class="ds:scroll-px-6 ds:px-6" hint :reset-key="session">
              <div v-for="n in 6" :key="n" class="ds:me-6 ds:flex ds:flex-col ds:items-center">
                <div class="ds:relative ds:h-unlock-h ds:w-unlock-w ds:overflow-hidden ds:rounded-hero">
                  <DsImage class="ds:absolute ds:inset-0" :set="art" alt="" fit="cover" position="top" />
                </div>
                <DsButton class="ds:-mt-6" variant="secondary" size="sm">{{ t('common.button.unlock_for', { price }) }}</DsButton>
              </div>
            </DsCarousel>
          </div>
        </div>
        <p class="sb-note"><button type="button" @click="session++">Показать заново</button></p>
      </div>
    `
  })
}
