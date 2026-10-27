import { existsSync } from 'node:fs'

// Локально ключи лежат в корневом .env, в CI приходят переменными окружения
if (existsSync('.env')) process.loadEnvFile('.env')

for (const name of ['NUXT_PUBLIC_SUPABASE_URL', 'NUXT_PUBLIC_SUPABASE_KEY', 'NUXT_SUPABASE_SECRET_KEY']) {
  if (!process.env[name]) throw new Error(`Для тестов базы нужна переменная ${name}`)
}
