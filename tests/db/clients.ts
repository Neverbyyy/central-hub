import { createClient } from '@supabase/supabase-js'

const url = process.env.NUXT_PUBLIC_SUPABASE_URL!
const options = { auth: { persistSession: false, autoRefreshToken: false } }

// Публичный ключ — тот, что виден в браузере
export const anon = createClient(url, process.env.NUXT_PUBLIC_SUPABASE_KEY!, options)
// Секретный ключ — только на сервере
export const service = createClient(url, process.env.NUXT_SUPABASE_SECRET_KEY!, options)

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

export async function readAnchor() {
  const { data, error } = await service.from('localizations').select('*').eq('technical_key', ANCHOR).single()
  if (error) throw error
  return data
}
