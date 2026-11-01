import { icons } from '@amaya/icons'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import DsIcon from './DsIcon.vue'

const meta = {
  title: 'Основа/DsIcon',
  component: DsIcon
} satisfies Meta<typeof DsIcon>

export default meta

export const All: StoryObj = {
  name: 'Набор и размеры',
  render: () => ({
    components: { DsIcon },
    setup: () => ({ names: Object.keys(icons), sizes: ['sm', 'md', 'lg'] }),
    template: `
      <table class="sb-table">
        <tbody>
          <tr v-for="name in names" :key="name">
            <td><code>{{ name }}</code></td>
            <td v-for="size in sizes" :key="size" class="ds:text-text-primary"><DsIcon :name="name" :size="size" /></td>
            <td class="ds:text-accent"><DsIcon :name="name" size="lg" /></td>
          </tr>
        </tbody>
      </table>
    `
  })
}
