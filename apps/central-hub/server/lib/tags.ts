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

/** Поставить (on) или снять тег у ключей; count — у скольких что-то поменялось (устаревшие не трогаются). */
export async function setKeysTag(db: SupabaseClient, { keys, tag, on }: { keys: string[], tag: unknown, on: unknown }, { actor }: { actor: string }) {
  if (typeof on !== 'boolean') throw new HubError('Нужно on: true — поставить тег, false — снять')
  const { data, error } = await db.rpc('set_keys_tag', { p_keys: keys, p_tag: existingName(tag), p_on: on, p_actor: actor })
  if (error) throw error
  return { count: data as number }
}
