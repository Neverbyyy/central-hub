import { inject } from 'vitest'

// Адрес и ключи локального Supabase нашёл global-setup.ts; .env (основная база) здесь не читаем
Object.assign(process.env, inject('supabaseEnv'))
