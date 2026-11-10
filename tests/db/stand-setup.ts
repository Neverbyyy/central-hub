import { existsSync } from 'node:fs'

// Проверка прав настоящего стенда (pnpm test:stand): ключи основной базы из .env или из окружения.
// Сюда идёт только security.test.ts — он лишь пытается писать публичным ключом и ждёт отказа.
// Секретным ключом он на стенде только читает: служебный якорь там не создаётся.
process.env.AMAYA_TEST_TARGET = 'stand'
if (existsSync('.env')) process.loadEnvFile('.env')

for (const name of ['NUXT_PUBLIC_SUPABASE_URL', 'NUXT_PUBLIC_SUPABASE_KEY', 'NUXT_SUPABASE_SECRET_KEY']) {
  if (!process.env[name]) throw new Error(`Для проверки стенда нужна переменная ${name}`)
}
