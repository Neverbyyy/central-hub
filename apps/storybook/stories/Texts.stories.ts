import { flatMessages, messages } from '@amaya/locales'
import type { Meta, StoryObj } from '@storybook/vue3-vite'

// Тексты набора ds на выбранном в тулбаре языке — то, что компоненты и экраны получают из сервиса.
// Пустой язык — для него ещё нет утверждённых текстов: в выгрузку попадает только утверждённое
const meta = {
  title: 'Основа/Тексты из сервиса',
  parameters: { themes: false }
} satisfies Meta

export default meta

export const DsSet: StoryObj = {
  name: 'Набор ds',
  render: (_args, { globals }) => ({
    setup() {
      const locale = String(globals.locale ?? 'en')
      const rows = Object.entries(flatMessages(messages[locale]))
      return { locale, rows }
    },
    template: `
      <div>
        <p v-if="!rows.length" class="sb-note" data-testid="texts-empty">
          На языке {{ locale.toUpperCase() }} утверждённых текстов набора ds пока нет. Утвердите ключи в сервисе
          и заберите их командой <code>pnpm l10n pull</code>.
        </p>
        <table v-else class="sb-table" data-testid="texts">
          <thead><tr><th>Ключ</th><th>{{ locale.toUpperCase() }}</th></tr></thead>
          <tbody>
            <tr v-for="[key, text] in rows" :key="key">
              <td><code>{{ key }}</code></td>
              <td :lang="locale">{{ text }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    `
  })
}
