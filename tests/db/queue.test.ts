import { beforeAll, describe, expect, it } from 'vitest'
import { keyError } from '../../packages/l10n-core/src'
import { allKeys, loadKeyContext, queueCounts, translationQueue } from '../../apps/central-hub/server/lib/keys'
import { ANCHOR, service, setTranslation, useLiveAnchor } from './clients'

// Очередь перевода и счётчики сверяются с определением: действующий ключ раздела, английский есть,
// а перевода на язык нет (пустая строка — тоже нет) или он устарел после правки английского.
// Эталон считается здесь по всем ключам — так любая оптимизация запроса не разойдётся с правилом.

interface Row {
  technical_key: string
  translations: Record<string, string | null>
  stale_langs: string[]
  description: string | null
  max_length: number | null
}

const LANGS = ['ru', 'de', 'es', 'it', 'pt', 'fr', 'sv', 'nl']
const PREFIXES = [undefined, 'legacy.inapp', 'legacy.pages_hub.', 'common.selftest', 'нет.такого']

async function expected(lang: string, prefix?: string) {
  const rows = await allKeys<Row>(service, 'technical_key, translations, stale_langs, description, max_length', prefix)
  return rows.flatMap((row) => {
    if (!row.translations.en) return []
    const reason = !row.translations[lang] ? 'missing' as const : row.stale_langs.includes(lang) ? 'stale' as const : null
    if (!reason) return []
    return [{
      key: row.technical_key,
      en: row.translations.en,
      current: row.translations[lang] ?? null,
      reason,
      description: row.description,
      max_length: row.max_length
    }]
  })
}

useLiveAnchor()

// На якоре — все случаи сразу: de очищен (пустой текст удаляет перевод), ru устарел, fr переведён и свежий
beforeAll(async () => {
  const run = Date.now()
  for (const [lang, value] of [['en', `Queue ${run}`], ['ru', `Очередь ${run}`], ['de', ''], ['en', `Queue ${run} v2`], ['fr', `File ${run}`]] as const) {
    const { error } = await setTranslation(ANCHOR, lang, value)
    if (error) throw error
  }
})

describe('очередь перевода', () => {
  it('на якоре: очищенный перевод — «нет перевода», правка английского — «устарел», свежий — не в очереди', async () => {
    const queue = async (lang: string) => (await translationQueue(service, { lang, prefix: 'common.selftest.anchor', limit: 200 })).items
    expect((await queue('de')).find(i => i.key === ANCHOR)).toMatchObject({ reason: 'missing', current: null })
    expect((await queue('ru')).find(i => i.key === ANCHOR)).toMatchObject({ reason: 'stale' })
    expect((await queue('fr')).find(i => i.key === ANCHOR)).toBeUndefined()
  })

  it.each(LANGS)('%s: состав, порядок и total совпадают с определением во всех разделах', async (lang) => {
    for (const prefix of PREFIXES) {
      const all = await expected(lang, prefix)
      const { total, items } = await translationQueue(service, { lang, prefix, limit: 200 })
      expect(total, `${lang} ${prefix}`).toBe(all.length)
      expect(items, `${lang} ${prefix}`).toEqual(all.slice(0, 200))
    }
  })

  it('limit: от 1 до 200, по умолчанию 50', async () => {
    const all = await expected('de')
    expect((await translationQueue(service, { lang: 'de' })).items).toEqual(all.slice(0, 50))
    expect((await translationQueue(service, { lang: 'de', limit: 0 })).items).toEqual(all.slice(0, 1))
    expect((await translationQueue(service, { lang: 'de', limit: 1000 })).items).toEqual(all.slice(0, 200))
  })

  it('неизвестный и исходный язык — ошибка', async () => {
    await expect(translationQueue(service, { lang: 'xx' })).rejects.toThrow('Неизвестный язык «xx»')
    await expect(translationQueue(service, { lang: 'en' })).rejects.toThrow('исходный язык')
  })

  it('счётчики по языкам совпадают с определением во всех разделах', async () => {
    for (const prefix of PREFIXES) {
      const counts = await queueCounts(service, { prefix })
      const wanted = await Promise.all(LANGS.map(async (lang) => {
        const all = await expected(lang, prefix)
        return { lang, missing: all.filter(i => i.reason === 'missing').length, stale: all.filter(i => i.reason === 'stale').length }
      }))
      expect(counts, String(prefix)).toEqual(wanted)
    }
  })
})

describe('правила ключа: база и l10n-core отвечают одинаково', () => {
  it.each([
    'common.button.continue.default', 'app.cars2.paywall.title', 'app.cars2.paywall.plan.year.badge',
    'web.lp_cars2.home.hero.title', 'brand.bandk.legal.company_name', 'ds.close_button.aria.label',
    'test.tm12.app.cars2.paywall.title', 'legacy.inapp.continue_btn_std', 'app.farm.onboarding.step_1.title',
    'app.cars_2.paywall.title', 'app.selftest_unknown.paywall.title', 'web.unknown_site.home.title',
    'Common.button.continue', 'common..button', 'common.button.', '.common.button', 'common.button',
    'common.ru.title', 'common.button.title_ru', 'other.button.continue', 'common.button-continue.default',
    `common.${'x'.repeat(200)}.title`, 'test.tm12.common.button.continue', 'test.unknown_test.app.cars2.title', ''
  ])('«%s»', async (key) => {
    const context = await loadKeyContext(service)
    const { data, error } = await service.rpc('l10n_key_error', { p_key: key })
    expect(error).toBeNull()
    // Тексты сообщений у базы свои — сверяем решение: годится ключ или нет
    expect(data === null, `база: ${data} | l10n-core: ${keyError(key, context)}`).toBe(keyError(key, context) === null)
  })
})
