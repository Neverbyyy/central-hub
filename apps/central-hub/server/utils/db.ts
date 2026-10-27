import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js'
import type { H3Event } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'

// Клиент с секретным ключом: обходит RLS, поэтому существует только на сервере.
// Типы схемы пока не генерируются, отсюда клиент без схемы.
export const useDb = (event: H3Event) => serverSupabaseServiceRole(event) as unknown as SupabaseClient

/** Ошибки правил из базы (raise exception) показываем человеку как есть, остальное — в лог. */
export function throwDbError(error: PostgrestError): never {
  if (error.code === 'P0002') {
    throw createError({ statusCode: 404, statusMessage: 'Not Found', message: error.message })
  }
  if (error.code === 'P0001' || error.code === '23514' || error.code === '23505') {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: error.message })
  }
  console.error('[db]', error)
  throw createError({ statusCode: 500, statusMessage: 'Database Error', message: 'Ошибка базы данных' })
}
