// Выгрузка в Figma: выборка разделов (например, Cars 2 вместе с общими).
// - figmaPluginTexts — для плагина «Amaya Hub — тексты»: переменные целиком или только изменённые;
// - figmaExport — файл на каждый язык для встроенного импорта переменных Figma.
// Без Nuxt-глобалов: общий для маршрутов и тестов базы.

import type { SupabaseClient } from '@supabase/supabase-js'
import { figmaModeFiles, figmaModeName, figmaVariables, type FigmaSourceRow } from '@amaya/l10n-core'
import { HubError } from './errors'
import { allKeys, keyTreeNested } from './keys'

// Живое обновление плагина просит изменения «с прошлого раза» с запасом: строка, закоммиченная позже начала
// своей транзакции, и расхождение часов сервера и базы не теряются, а плагин всё равно применяет только отличия
const SINCE_OVERLAP_MS = 30_000

async function editorLanguages(db: SupabaseClient) {
  const { data, error } = await db.from('languages').select('code').eq('in_editor', true).order('position')
  if (error) throw error
  return (data as { code: string }[]).map(l => l.code)
}

/** Разделы выборки без вложенных друг в друга и языки в порядке грида. */
async function resolveSelection(db: SupabaseClient, { prefixes, languages }: { prefixes: string[], languages?: string[] }) {
  // Раздел — начало ключа с точкой: common. не должен захватить common_x.
  const sections = [...new Set(prefixes.map(p => p.trim()).filter(Boolean).map(p => (p.endsWith('.') ? p : `${p}.`)))]
  if (!sections.length) throw new HubError('Выберите хотя бы один раздел')
  if (sections.length > 50) throw new HubError('Не больше 50 разделов за раз')

  const known = await editorLanguages(db)
  const unknown = (languages ?? []).filter(lang => !known.includes(lang))
  if (unknown.length) throw new HubError(`Неизвестные языки: ${unknown.join(', ')}`)
  // Порядок режимов — как в гриде
  const modes = languages?.length ? known.filter(lang => languages.includes(lang)) : known

  // Раздел внутри уже выбранного (app. и app.cars2.) ничего не добавит — читаем только внешние
  const roots = sections.filter(s => !sections.some(other => other !== s && s.startsWith(other)))
  return { roots, modes }
}

/** Дерево разделов — то же, что слева в сервисе, — и языки: для окна плагина. */
export async function figmaPluginSections(db: SupabaseClient) {
  const [sections, languages] = await Promise.all([keyTreeNested(db), editorLanguages(db)])
  return { sections, modes: languages.map(code => ({ code, name: figmaModeName(code) })) }
}

/**
 * Тексты для плагина. Без since — все действующие ключи выборки; с since — только изменённые с этого
 * момента, а помеченные устаревшими уходят в removed. now — since для следующего запроса.
 */
export async function figmaPluginTexts(
  db: SupabaseClient,
  { prefixes, languages, since }: { prefixes: string[], languages?: string[], since?: string }
) {
  const now = new Date().toISOString()
  const { roots, modes } = await resolveSelection(db, { prefixes, languages })

  let from: string | undefined
  if (since !== undefined) {
    const time = Date.parse(since)
    if (Number.isNaN(time)) throw new HubError('since — время в формате ISO 8601')
    from = new Date(time - SINCE_OVERLAP_MS).toISOString()
  }

  const rows = new Map<string, FigmaSourceRow & { deprecated_at?: string | null }>()
  const columns = `technical_key, translations, description${from ? ', deprecated_at' : ''}`
  for (const prefix of roots) {
    for (const row of await allKeys<FigmaSourceRow & { deprecated_at?: string | null }>(db, columns, prefix, { since: from })) {
      rows.set(row.technical_key, row)
    }
  }
  const all = [...rows.values()]

  try {
    return {
      now,
      modes: modes.map(code => ({ code, name: figmaModeName(code) })),
      variables: figmaVariables(all.filter(row => !row.deprecated_at), { languages: modes }),
      removed: all.filter(row => row.deprecated_at).map(row => row.technical_key).sort()
    }
  } catch (error) {
    throw new HubError((error as Error).message)
  }
}

export async function figmaExport(db: SupabaseClient, { prefixes, languages }: { prefixes: string[], languages?: string[] }) {
  const { roots, modes } = await resolveSelection(db, { prefixes, languages })
  const rows = new Map<string, FigmaSourceRow>()
  for (const prefix of roots) {
    for (const row of await allKeys<FigmaSourceRow>(db, 'technical_key, translations, description', prefix)) rows.set(row.technical_key, row)
  }

  try {
    return { keys: rows.size, languages: modes, files: figmaModeFiles([...rows.values()], { languages: modes }) }
  } catch (error) {
    throw new HubError((error as Error).message)
  }
}
