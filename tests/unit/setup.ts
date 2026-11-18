import { intlLocale } from '../../apps/central-hub/shared/utils/hubLocale'
import { ruT } from './i18n'

// Автоимпорты Nuxt, которыми пользуются утилиты интерфейса (app/composables/useHubLocale.ts, shared/utils): в тестах
// нет приложения, поэтому язык — русский, а перевод — настоящий словарь ru
Object.assign(globalThis, {
  hubT: ruT,
  currentHubLocale: () => 'ru',
  intlLocale
})
