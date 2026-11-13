// Теги: свой список (таблица tags) и теги ключей. Правило имени — tagNameError, общее с интерфейсом;
// у ключа только теги из списка — это держит база. Без Nuxt-глобалов: маршруты, MCP и тесты базы.

import type { SupabaseClient } from '@supabase/supabase-js'
import { tagNameError } from '../../shared/utils/tags'
import { HubError } from './errors'

function checkedName(value: unknown): string {
  if (typeof value !== 'string') throw new HubError('Нужно название тега')
  const message = tagNameError(value)
  if (message) throw new HubError(message)
  return value.trim()
}

function existingName(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new HubError('Нужен тег')
  return value
}

/** Все теги по алфавиту — для нейросети (list_registry). */
export async function listTags(db: SupabaseClient): Promise<string[]> {
  const { data, error } = await db.rpc('get_unique_tags')
  if (error) throw error
  return (data as { tag: string }[]).map(row => row.tag)
}

/** Новый тег без ключей. «Landing» при «landing» — отказ: тег уже есть. */
export async function createTag(db: SupabaseClient, name: unknown, { actor }: { actor: string }) {
  const { data, error } = await db.rpc('create_tag', { p_name: checkedName(name), p_actor: actor })
  if (error) throw error
  return { name: data as string }
}

/** Переименовать у всех ключей; count — у скольких ключей поменялся. */
export async function renameTag(db: SupabaseClient, { from, to }: { from: unknown, to: unknown }, { actor }: { actor: string }) {
  const { data, error } = await db.rpc('rename_tag', { p_from: existingName(from), p_to: checkedName(to), p_actor: actor })
  if (error) throw error
  return { count: data as number }
}

/** Удалить тег: снимается со всех ключей; count — со скольких. */
export async function deleteTag(db: SupabaseClient, name: unknown, { actor }: { actor: string }) {
  const { data, error } = await db.rpc('delete_tag', { p_name: existingName(name), p_actor: actor })
  if (error) throw error
  return { count: data as number }
}

// Ключи уходят в адрес запроса к базе — пачками, чтобы адрес не вырос до сотен килобайт
const KEYS_PER_READ = 100

/**
 * Поставить (on) или снять тег у ключей; count — у скольких что-то поменялось (устаревшие не трогаются).
 * updatedAt — самое позднее updated_at этих ключей после записи: событие Realtime с updated_at не раньше него уже знает
 * об этой правке, а более раннее — старое (галочки ставят быстрее, чем доходят события). null — прочитать не вышло.
 */
export async function setKeysTag(db: SupabaseClient, { keys, tag, on }: { keys: string[], tag: unknown, on: unknown }, { actor }: { actor: string }) {
  if (typeof on !== 'boolean') throw new HubError('Нужно on: true — поставить тег, false — снять')
  const { data, error } = await db.rpc('set_keys_tag', { p_keys: keys, p_tag: existingName(tag), p_on: on, p_actor: actor })
  if (error) throw error
  return { count: data as number, updatedAt: await latestUpdate(db, keys) }
}

// Запись уже прошла — ошибка чтения не должна выглядеть как отказ: без времени интерфейс подождёт подольше
async function latestUpdate(db: SupabaseClient, keys: string[]): Promise<string | null> {
  let latest: string | null = null
  for (let i = 0; i < keys.length; i += KEYS_PER_READ) {
    const { data, error } = await db
      .from('localizations')
      .select('updated_at')
      .in('technical_key', keys.slice(i, i + KEYS_PER_READ))
      .order('updated_at', { ascending: false })
      .limit(1)
    if (error) return null
    const value = (data?.[0] as { updated_at?: string } | undefined)?.updated_at
    if (value && (!latest || Date.parse(value) > Date.parse(latest))) latest = value
  }
  return latest
}
