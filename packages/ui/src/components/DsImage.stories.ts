import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { imageSet } from '../image'
import { DEMO_ART } from '../stories'
import DsImage from './DsImage.vue'

const meta = {
  title: 'Общее/Картинка',
  component: DsImage
} satisfies Meta<typeof DsImage>

export default meta

// Весь арт пейволлов — по конвенции InApp: 12 файлов на картинку, браузер сам берёт размер и формат
export const Convention: StoryObj = {
  name: 'Картинка',
  render: () => ({
    components: { DsImage },
    setup: () => ({ set: imageSet(DEMO_ART) }),
    template: `
      <div class="ds:p-6" style="max-width: 480px">
        <DsImage :set="set" alt="" ratio="3 / 2" data-testid="image" />
        <p class="sb-note">small до 844 px, medium от 844, large от 1024 при высоте от 600; webp, где понимает браузер; @2x на плотных экранах.</p>
      </div>
    `
  })
}
