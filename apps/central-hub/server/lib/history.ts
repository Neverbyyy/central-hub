// История ключа действиями: строки одной правки (импорт 9 языков, «Утвердить всё») — одно действие.
// Без Nuxt-глобалов: используется маршрутом /api/keys/history и тестами базы.

import type { SupabaseClient } from '@supabase/supabase-js'

export interface HistoryEntry {
  lang: string | null
  field: string
  old_value: string | null
  new_value: string | null
}

export interface HistoryAction {
  // id первой строки действия — ключ для списка
  id: number
  created_at: string
  actor: string
  source: string
  entries: HistoryEntry[]
}

/**
 * Действия ключа от новых к старым, срез [offset, offset + limit). Одна правка — одна транзакция, а now() в ней один:
 * строки с одинаковыми временем, автором и источником — одно действие. Группирует и режет база (key_history) — сервер
 * получает только нужную страницу, а не все строки истории ключа. Записей о тегах в выдаче нет.
 */
export async function keyHistory(
  db: SupabaseClient,
  key: string,
  { offset = 0, limit = 10 }: { offset?: number, limit?: number } = {}
): Promise<{ total: number, actions: HistoryAction[] }> {
  const { data, error } = await db.rpc('key_history', { p_key: key, p_offset: offset, p_limit: limit })
  if (error) throw error
  const page = data as { total: number, actions: HistoryAction[] }
  return { total: Number(page.total), actions: page.actions }
}
