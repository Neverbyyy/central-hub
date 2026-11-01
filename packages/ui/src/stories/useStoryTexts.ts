import { useI18n } from 'vue-i18n'

// Только для историй Storybook: тексты — ключами из сервиса (набор ds) через vue-i18n, его ставит Storybook.
// Своих строк истории не пишут: длинный текст — самый длинный из настоящих переводов ключа
export function useStoryTexts() {
  const { t, availableLocales } = useI18n()

  /** Самый длинный перевод ключа среди языков — проверка, что вёрстка его выдерживает. */
  const longest = (key: string) => availableLocales
    .map(locale => t(key, {}, { locale }))
    .reduce((a, b) => (b.length > a.length ? b : a), '')

  return { t, longest }
}

// Арт Cars 2 из InApp по конвенции 12 файлов (apps/storybook/public/demo) — только для историй
export const DEMO_ART = '/demo/cars2/cars2'
export const DEMO_BADGES = {
  appStore: '/demo/stores/app-store.svg',
  googlePlay: '/demo/stores/google-play.svg'
}
