import type { TestProject } from 'vitest/node'
import { importSet } from '../../apps/central-hub/server/lib/sync'
import { localSupabaseEnv, makeClient, type SupabaseEnv } from './env'
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

  const service = makeClient(env.NUXT_PUBLIC_SUPABASE_URL, env.NUXT_SUPABASE_SECRET_KEY)
  for (const [name, set] of Object.entries(SETS)) {
    await importSet(service, name, readFixtures(name as keyof typeof SETS), { actor: IMPORTER, sourceRef: set.commit })
  }
}
