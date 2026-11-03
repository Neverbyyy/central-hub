// Язык страницы: подгрузить тексты языка (и английского — для недостающих переводов) и включить его.
// Вызывается в <script setup> страницы до первого await: await useLocale('ru')
import { loadMessages } from '@amaya/locales/lazy'
import { useI18n } from 'vue-i18n'

export async function useLocale(lang: string): Promise<void> {
  const { locale, availableLocales, setLocaleMessage } = useI18n({ useScope: 'global' })
  const needed = [...new Set(['en', lang])].filter(code => !availableLocales.includes(code))
  const loaded = await Promise.all(needed.map(code => loadMessages(code)))
  needed.forEach((code, index) => setLocaleMessage(code, loaded[index] ?? {}))
  locale.value = lang
}
