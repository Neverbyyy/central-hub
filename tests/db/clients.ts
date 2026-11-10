import { afterAll, beforeAll } from 'vitest'
import { makeClient } from './env'

const url = process.env.NUXT_PUBLIC_SUPABASE_URL!

// Публичный ключ — тот, что виден в браузере
export const anon = makeClient(url, process.env.NUXT_PUBLIC_SUPABASE_KEY!)
// Секретный ключ — только на сервере
export const service = makeClient(url, process.env.NUXT_SUPABASE_SECRET_KEY!)

// Служебный ключ для тестов, которым нужна настоящая строка. Удалить его нельзя
// (как и любой другой), поэтому между прогонами он остаётся помеченным устаревшим.
export const ANCHOR = 'common.selftest.anchor.default'
export const ACTOR = 'Автотест'

export async function ensureAnchor() {
  const { error } = await service
    .from('localizations')
    .upsert(
      { technical_key: ANCHOR, description: 'Служебный ключ автотестов базы, в продуктах не используется', translations: { en: 'Selftest' } },
      { onConflict: 'technical_key', ignoreDuplicates: true }
    )
  if (error) throw error
}

/** Правка текста от имени автотеста — как ячейка грида; expected — текст, от которого начинали (иначе 409). */
export const setTranslation = (key: string, lang: string, value: string, expected?: string) =>
  service.rpc('set_translation', {
    p_key: key,
    p_lang: lang,
    p_value: value,
    p_actor: ACTOR,
    p_source: 'test',
    ...(expected === undefined ? {} : { p_expected: expected })
  })

export const restoreKeys = (keys: string[]) => service.rpc('restore_keys', { p_keys: keys, p_actor: ACTOR, p_source: 'test' })
export const deprecateKeys = (keys: string[]) => service.rpc('deprecate_keys', { p_keys: keys, p_actor: ACTOR, p_source: 'test' })

/** Якорь действующий на время файла: перед тестами — есть и не устарел, после — снова помечен устаревшим. */
export function useLiveAnchor() {
  beforeAll(async () => {
    await ensureAnchor()
    await restoreKeys([ANCHOR])
  })
  afterAll(async () => {
    await deprecateKeys([ANCHOR])
  })
}

export async function readAnchor() {
  const { data, error } = await service.from('localizations').select('*').eq('technical_key', ANCHOR).single()
  if (error) throw error
  return data
}
