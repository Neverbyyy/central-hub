import { execSync } from 'node:child_process'

export interface SupabaseEnv {
  NUXT_PUBLIC_SUPABASE_URL: string
  NUXT_PUBLIC_SUPABASE_KEY: string
  NUXT_SUPABASE_SECRET_KEY: string
}

/**
 * Адрес и ключи локального Supabase (`pnpm db:start`). Тесты базы пишут, импортируют
 * fixtures и меняют служебные ключи, поэтому основную базу из .env они не трогают:
 * импорт заменил бы правки людей в строках InApp и Pages Hub значениями из файлов.
 */
export function localSupabaseEnv(): SupabaseEnv {
  let status: Record<string, string>
  try {
    status = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }))
  } catch {
    throw new Error('Тесты базы идут только на локальном Supabase: запустите Docker и `pnpm db:start`')
  }

  const url = status.API_URL ?? ''
  if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url)) {
    throw new Error(`Тесты базы идут только на локальном Supabase, а не на «${url}»`)
  }
  const publishable = status.PUBLISHABLE_KEY ?? status.ANON_KEY
  const secret = status.SECRET_KEY ?? status.SERVICE_ROLE_KEY
  if (!publishable || !secret) throw new Error('supabase status не отдал ключи локального стека')

  return { NUXT_PUBLIC_SUPABASE_URL: url, NUXT_PUBLIC_SUPABASE_KEY: publishable, NUXT_SUPABASE_SECRET_KEY: secret }
}
