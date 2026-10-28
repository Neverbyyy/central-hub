import { createClient } from '@supabase/supabase-js'
import type { TestProject } from 'vitest/node'
import { importSet } from '../../apps/central-hub/server/lib/sync'
import { localSupabaseEnv, type SupabaseEnv } from './env'
import { IMPORTER, readFixtures, SETS } from './fixtures'

declare module 'vitest' {
  export interface ProvidedContext {
    supabaseEnv: SupabaseEnv
  }
}

// Один раз на прогон: находим локальный стек и заносим строки InApp и Pages Hub.
// Файлы тестов vitest запускает не по алфавиту, а им (mcp, keys) нужны legacy-строки.
export default async function setup(project: TestProject) {
  const env = localSupabaseEnv()
  project.provide('supabaseEnv', env)

  const service = createClient(env.NUXT_PUBLIC_SUPABASE_URL, env.NUXT_SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
  for (const [name, set] of Object.entries(SETS)) {
    await importSet(service, name, readFixtures(set.dir), { actor: IMPORTER, sourceRef: set.commit })
  }
}
