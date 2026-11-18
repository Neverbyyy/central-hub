import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { checkText, descriptionError, figmaUrlError, keyError, newKeyError, type KeyContext } from '../../packages/l10n-core/src/index'
import { reviewGateMessage } from '../../apps/central-hub/shared/utils/exportSets'
import { HUB_LOCALES, intlLocale, joinList } from '../../apps/central-hub/shared/utils/hubLocale'
import { createLocalizer, type MessageEntry } from '../../apps/central-hub/shared/utils/localizeMessage'
import { localizeRule, RULE_MESSAGES } from '../../apps/central-hub/shared/utils/ruleMessages'
import { localizeServerMessage, SERVER_MESSAGES } from '../../apps/central-hub/server/utils/errorMessages'
import { hubMessages, hubTranslator } from './i18n'

// Язык интерфейса: словари ru / en / uz (app/locales) и каталог сообщений, которые рождаются по-русски (правила
// l10n-core, ошибки сервера и базы) — их переводят по русскому шаблону

const CYRILLIC = /[А-Яа-яЁё]/

// Все строки словаря: «раздел.ключ» → текст
function flatten(value: unknown, prefix = '', out = new Map<string, string>()) {
  if (typeof value === 'string') out.set(prefix, value)
  else for (const [key, child] of Object.entries(value as object)) flatten(child, prefix ? `${prefix}.${key}` : key, out)
  return out
}

// Подстановки сообщения vue-i18n: {name}; литералы {'@'} — не подстановки
const params = (text: string) => [...new Set([...text.matchAll(/\{(\w+)\}/g)].map(m => m[1]!))].sort()

const dictionaries = Object.fromEntries(HUB_LOCALES.map(locale => [locale, flatten(hubMessages(locale))]))

describe('словари интерфейса', () => {
  it('у трёх языков одни и те же строки', () => {
    const ru = [...dictionaries.ru!.keys()].sort()
    for (const locale of ['en', 'uz'] as const) expect([...dictionaries[locale]!.keys()].sort()).toEqual(ru)
  })

  it('подстановки в переводе — те же, что в русском', () => {
    for (const locale of ['en', 'uz'] as const) {
      for (const [key, text] of dictionaries.ru!) {
        expect({ key, params: params(dictionaries[locale]!.get(key) ?? '') }).toEqual({ key, params: params(text) })
      }
    }
  })

  it('каждое сообщение разбирается vue-i18n, и ни одно не остаётся ключом', () => {
    for (const locale of HUB_LOCALES) {
      const t = hubTranslator(locale)
      for (const [key, text] of dictionaries[locale]!) {
        const values = Object.fromEntries(params(text).map(name => [name, `<${name}>`]))
        // Бросает исключение на синтаксисе: неэкранированная @, незакрытая скобка
        expect({ locale, key, text: t(key, values) }).not.toEqual({ locale, key, text: key })
        if (text.includes('|')) t(key, 5)
      }
    }
  })

  it('в английском и узбекском нет кириллицы', () => {
    for (const locale of ['en', 'uz'] as const) {
      for (const [key, text] of dictionaries[locale]!) expect({ locale, key, cyrillic: CYRILLIC.test(text) }).toEqual({ locale, key, cyrillic: false })
    }
  })
})

describe('списки и даты одинаково на сервере и в браузере', () => {
  it('узбекский список — через «va», без Intl: в браузерах его данных нет', () => {
    expect(joinList([], 'uz')).toBe('')
    expect(joinList(['InApp'], 'uz')).toBe('InApp')
    expect(joinList(['InApp', 'Pages Hub'], 'uz')).toBe('InApp va Pages Hub')
    expect(joinList(['InApp', 'Pages Hub', 'Dizayn tizimi'], 'uz')).toBe('InApp, Pages Hub va Dizayn tizimi')
    expect(joinList(['InApp', 'Pages Hub'], 'en')).toBe('InApp and Pages Hub')
    expect(joinList(['InApp', 'Pages Hub'], 'ru')).toBe('InApp и Pages Hub')
  })

  it('узбекские даты — цифрами, как в узбекском CLDR', () => {
    const date = new Date('2026-11-18T13:20:00')
    const options = { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' } as const
    expect(new Intl.DateTimeFormat(intlLocale('uz'), options).format(date)).toBe('18/11/26, 13:20')
  })
})

describe('перевод по русскому шаблону', () => {
  const localize = createLocalizer([
    ['Ключ «{key}» не найден', 'Key “{key}” not found', '«{key}» kaliti topilmadi'],
    ['Перевод не сохранён: {issues}', 'The translation wasn’t saved: {issues}', 'Tarjima saqlanmadi: {issues}'],
    ['Пробелы в начале или в конце строки', 'Spaces at the start or end of the string', 'Satr boshida yoki oxirida bo‘sh joylar'],
    ['Дизайн-система', 'Design system', 'Dizayn tizimi']
  ])

  it('по-русски — как есть; на другом языке — шаблон с подставленными частями', () => {
    expect(localize('Ключ «app.cars2.title» не найден', 'ru')).toBe('Ключ «app.cars2.title» не найден')
    expect(localize('Ключ «app.cars2.title» не найден', 'en')).toBe('Key “app.cars2.title” not found')
    expect(localize('Ключ «app.cars2.title» не найден', 'uz')).toBe('«app.cars2.title» kaliti topilmadi')
  })

  it('часть, которая сама есть в каталоге, тоже переводится; список через «; » и «префикс: сообщение» — по частям', () => {
    expect(localize('Перевод не сохранён: Пробелы в начале или в конце строки', 'en')).toBe('The translation wasn’t saved: Spaces at the start or end of the string')
    expect(localize('Ключ «a» не найден; Ключ «b» не найден', 'en')).toBe('Key “a” not found; Key “b” not found')
    expect(localize('locales/de.json: Ключ «a» не найден', 'en')).toBe('locales/de.json: Key “a” not found')
  })

  it('чего нет в каталоге, остаётся по-русски', () => {
    expect(localize('Совсем другая ошибка', 'en')).toBe('Совсем другая ошибка')
    expect(localize('', 'en')).toBe('')
  })
})

// Каталог: подстановки одни и те же во всех трёх языках, в переводах нет кириллицы
function expectCatalog(entries: readonly MessageEntry[]) {
  for (const [ru, en, uz] of entries) {
    expect({ ru, en: params(en), uz: params(uz) }).toEqual({ ru, en: params(ru), uz: params(ru) })
    expect({ ru, cyrillic: CYRILLIC.test(en) || CYRILLIC.test(uz) }).toEqual({ ru, cyrillic: false })
  }
}

describe('правила l10n-core на языке интерфейса', () => {
  it('каталог правил согласован', () => expectCatalog(RULE_MESSAGES))

  it('каждое сообщение правил находит перевод', () => {
    const ctx: KeyContext = { registry: { game: ['cars2'], site: ['lp_cars2'], brand: ['bandk'], test: ['tm12'], project: ['inapp'] }, languages: ['en', 'ru', 'de'] }
    const messages = [
      keyError('', ctx),
      keyError(`common.${'a'.repeat(200)}`, ctx),
      keyError('common..title', ctx),
      keyError('foo.bar.baz', ctx),
      keyError('common.button', ctx),
      keyError('app.cars.paywall.title', ctx),
      keyError('web.lp_car.home.title', ctx),
      keyError('brand.bk.legal.name', ctx),
      keyError('test.tm1.app.cars2.title', ctx),
      keyError('legacy.pages.basic.title', ctx),
      keyError('common.Button.continue', ctx),
      keyError('test.tm12.test.tm12.app.title', ctx),
      keyError('common.button.title_ru', ctx),
      newKeyError('legacy.inapp.title', ctx),
      newKeyError('foo.bar.baz', ctx),
      descriptionError('short'),
      figmaUrlError('http://example.com'),
      ...checkText({ text: 'Long text {count} {extra} @ { } $ | <b>x</b> ', source: 'Text {count} {price}', maxLength: 5 }).map(issue => issue.message),
      ...checkText({ text: 'BUY NOW' }).map(issue => issue.message)
    ]
    // Все виды замечаний checkText: лимит, подстановки, экранирование, HTML, капс, пробелы
    expect(messages.length).toBe(17 + 11)
    expect(messages.every(Boolean)).toBe(true)
    for (const message of messages as string[]) {
      for (const locale of ['en', 'uz'] as const) {
        expect({ message, cyrillic: CYRILLIC.test(localizeRule(message, locale)) }).toEqual({ message, cyrillic: false })
      }
    }
  })
})

describe('ошибки сервера на языке интерфейса', () => {
  it('каталог ошибок согласован', () => expectCatalog(SERVER_MESSAGES))

  it('«сначала дизайн-система» переводится целиком, вместе с названием набора', () => {
    expect(localizeServerMessage(reviewGateMessage('ds', { keys: ['a', 'b'], truncated: true }), 'en'))
      .toBe('“Design system” comes first: shared keys (2+) are not in its main branch yet. Merge its PR or export without review')
    for (const block of [{ keys: [], truncated: true }, 'not-connected'] as const) {
      for (const locale of ['en', 'uz'] as const) expect(localizeServerMessage(reviewGateMessage('ds', block), locale)).not.toMatch(CYRILLIC)
    }
  })

  it('каждая ошибка из функций базы (raise exception) находит перевод', () => {
    const migrations = new URL('../../supabase/migrations/', import.meta.url)
    const texts = new Set<string>()
    for (const file of readdirSync(migrations).filter(name => name.endsWith('.sql'))) {
      const sql = readFileSync(new URL(file, migrations), 'utf8')
      for (const [, text] of sql.matchAll(/raise exception '([^']+)'/g)) texts.add(text!)
      for (const [, text] of sql.matchAll(/forbid_change\('([^']+)'\)/g)) texts.add(text!)
    }
    // '%' — текст собран в другом месте (l10n_key_error — те же правила, что keyError); второе — прежний текст,
    // его заменила миграция 20261112110000_tags_no_page
    texts.delete('%')
    texts.delete('Тега «%» нет — создайте его на странице «Теги»')
    expect(texts.size).toBeGreaterThan(15)
    for (const text of texts) {
      const message = text.replaceAll('%', 'common.button.continue')
      expect({ message, cyrillic: CYRILLIC.test(localizeServerMessage(message, 'en')) }).toEqual({ message, cyrillic: false })
    }
  })
})
