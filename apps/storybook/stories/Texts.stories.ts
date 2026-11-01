import { flatMessages, messages } from '@amaya/locales'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { computed } from 'vue'
import { storyGlobals } from '../.storybook/env'

// Тексты набора ds — то, что компоненты и экраны получают из сервиса: все языки рядом, язык из тулбара подсвечен.
// Пустая ячейка — на этом языке нет утверждённого текста: в выгрузку попадает только утверждённое
const LANGUAGES = ['en', 'ru', 'de', 'es', 'it', 'pt', 'fr', 'sv', 'nl']

const meta = {
  title: 'Основа/Тексты из сервиса',
  parameters: { themes: false }
} satisfies Meta

export default meta

export const DsSet: StoryObj = {
  name: 'Набор ds',
  render: () => ({
    setup() {
      const byLang = Object.fromEntries(LANGUAGES.map(lang => [lang, flatMessages(messages[lang])]))
      // Ключи — в порядке файла английского, затем те, что есть только в переводах
      const keys = [...new Set(LANGUAGES.flatMap(lang => Object.keys(byLang[lang]!)))]
      const locale = computed(() => storyGlobals.locale)
      return { LANGUAGES, byLang, keys, locale }
    },
    template: `
      <div>
        <p v-if="!keys.length" class="sb-note" data-testid="texts-empty">
          Утверждённых текстов набора ds пока нет. Утвердите ключи в сервисе и выгрузите их:
          «Выгрузить в код» → «Дизайн-система» или <code>pnpm l10n pull</code>.
        </p>
        <div v-else style="overflow-x: auto">
          <table class="sb-table" data-testid="texts">
            <thead>
              <tr>
                <th>Ключ</th>
                <th v-for="lang in LANGUAGES" :key="lang" :class="{ 'sb-current': lang === locale }">{{ lang.toUpperCase() }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="key in keys" :key="key">
                <td><code>{{ key }}</code></td>
                <td
                  v-for="lang in LANGUAGES"
                  :key="lang"
                  :lang="lang"
                  :data-lang="lang"
                  :class="{ 'sb-current': lang === locale }"
                >{{ byLang[lang][key] ?? '' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `
  })
}
