import { readdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import type { HubLocale } from '../../apps/central-hub/shared/utils/hubLocale'
import { hubPluralRules, type Translate } from '../../apps/central-hub/shared/utils/plural'

// Словари интерфейса для тестов — те же файлы app/locales/<язык>/<раздел>.json, что грузит сервис, и настоящий vue-i18n
// с теми же правилами множественного числа: в ожиданиях тесты видят тексты так, как их видит человек

const LOCALES = new URL('../../apps/central-hub/app/locales/', import.meta.url)

/** Словарь языка: { раздел: содержимое файла раздела }. */
export function hubMessages(locale: HubLocale): Record<string, Record<string, unknown>> {
  const dir = new URL(`${locale}/`, LOCALES)
  return Object.fromEntries(readdirSync(dir)
    .filter(file => file.endsWith('.json'))
    .map(file => [file.slice(0, -'.json'.length), JSON.parse(readFileSync(new URL(file, dir), 'utf8'))]))
}

// vue-i18n — зависимость сервиса, а не корня репозитория
const require = createRequire(new URL('../../apps/central-hub/package.json', import.meta.url))
const { createI18n } = require('vue-i18n') as { createI18n: (options: object) => { global: { t: Translate } } }

/** Переводчик на языке интерфейса, как в сервисе; ошибку синтаксиса сообщения vue-i18n бросает исключением. */
export function hubTranslator(locale: HubLocale): Translate {
  const i18n = createI18n({
    legacy: false,
    locale,
    fallbackLocale: false,
    pluralRules: hubPluralRules,
    missingWarn: false,
    fallbackWarn: false,
    messages: { [locale]: hubMessages(locale) }
  })
  return i18n.global.t
}

export const ruT = hubTranslator('ru')
