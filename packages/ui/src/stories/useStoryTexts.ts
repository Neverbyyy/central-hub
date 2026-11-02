import { useI18n } from 'vue-i18n'

// Только для историй Storybook: тексты — ключами из сервиса (набор ds) через vue-i18n, его ставит Storybook.
// Своих строк истории не пишут; длинный текст проверяется переключением языка в тулбаре (немецкий — самый длинный)
export function useStoryTexts() {
  const { t } = useI18n()
  return { t }
}
