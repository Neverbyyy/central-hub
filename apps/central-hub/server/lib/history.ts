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

interface HistoryRow extends HistoryEntry {
  id: number
  created_at: string
  actor: string
  source: string
}

const PAGE = 1000

/**
 * Действия ключа от новых к старым, срез [offset, offset + limit).
 * Одна правка — одна транзакция, а now() в ней один: строки с одинаковыми временем, автором и источником —
 * одно действие. У ключа строк десятки или сотни, поэтому читаем все и режем по действиям, а не по строкам.
 */
export async function keyHistory(
  db: SupabaseClient,
  key: string,
  { offset = 0, limit = 10 }: { offset?: number, limit?: number } = {}
): Promise<{ total: number, actions: HistoryAction[] }> {
  const rows: HistoryRow[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from('history')
      .select('id, lang, field, old_value, new_value, actor, source, created_at')
      .eq('technical_key', key)
      .order('created_at', { ascending: false })
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) throw error
    rows.push(...(data as HistoryRow[]))
    if (data.length < PAGE) break
  }

  const actions: HistoryAction[] = []
  for (const { id, created_at, actor, source, ...entry } of rows) {
    const last = actions.at(-1)
    if (last && last.created_at === created_at && last.actor === actor && last.source === source) last.entries.push(entry)
    else actions.push({ id, created_at, actor, source, entries: [entry] })
  }
  return { total: actions.length, actions: actions.slice(offset, offset + limit) }
}
