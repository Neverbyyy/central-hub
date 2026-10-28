// Импорт файлов локалей проекта в сервис и выгрузка обратно.
// Без Nuxt-глобалов: используется и маршрутами /api/cli/*, и тестами базы.

import { createHash } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { filePath, legacyKey, readLocaleFile, renderLocaleFile, type LocaleEntry, type LocaleFormat } from '@amaya/l10n-core'

export interface ExportSet {
  name: string
  project: string
  format: LocaleFormat
  legacy_prefix: string | null
  include_prefixes: string[]
  languages: string[]
  path_template: string
  final_newline: boolean
}

export interface ImportReport {
  total: number
  added: number
  changed: number
  restored: number
  unchanged: number
  deprecated: number
}

export interface ExportedFile {
  lang: string
  // Путь в проекте, например src/locales/en.json
  path: string
  content: string
  sha256: string
}

export interface ExportResult {
  set: string
  // Хеш содержимого всех файлов: одинаковый, пока ничего не менялось
  revision: string
  files: ExportedFile[]
}

/** Ошибка, понятная человеку; status — HTTP-код для маршрутов. */
export class SyncError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message)
  }
}

interface KeyRow {
  technical_key: string
  translations: Record<string, string | null>
  legacy_path: string[] | null
}

const PAGE = 1000

const sha256 = (text: string) => createHash('sha256').update(text).digest('hex')

// _ и % в префиксе — обычные символы, а не шаблоны LIKE
const escapeLike = (value: string) => value.replace(/[\\%_]/g, char => `\\${char}`)

async function loadSet(db: SupabaseClient, name: string): Promise<ExportSet> {
  const { data, error } = await db.from('export_sets').select('*').eq('name', name).maybeSingle()
  if (error) throw error
  if (!data) throw new SyncError(`Нет набора выгрузки «${name}»`, 404)
  return data as ExportSet
}

/**
 * Заносит файлы проекта как есть: ключи — legacy-префикс + путь, файлы — шаблонами для выгрузки.
 * files: { en: '…содержимое en.json…', … } — ровно языки набора.
 */
export async function importSet(
  db: SupabaseClient,
  setName: string,
  files: Record<string, string>,
  { actor, sourceRef }: { actor: string, sourceRef?: string | null }
): Promise<ImportReport> {
  const set = await loadSet(db, setName)
  const prefix = set.legacy_prefix
  if (!prefix) throw new SyncError(`У набора «${setName}» нет префикса legacy — импортировать некуда`)

  const missing = set.languages.filter(lang => typeof files[lang] !== 'string')
  if (missing.length) throw new SyncError(`Не хватает файлов языков: ${missing.join(', ')}`)
  const extra = Object.keys(files).filter(lang => !set.languages.includes(lang))
  if (extra.length) throw new SyncError(`Языки не из набора «${setName}»: ${extra.join(', ')}`)

  const rows = new Map<string, { technical_key: string, legacy_path: string[], translations: Record<string, string | null> }>()
  for (const lang of set.languages) {
    const text = files[lang]!
    let entries: LocaleEntry[]
    try {
      entries = readLocaleFile(text)
      // Шаблон, который выгрузка не воспроизводит байт в байт, принимать нельзя
      if (renderLocaleFile({ template: text, entries }) !== text) throw new Error('файл не воспроизводится выгрузкой')
    } catch (error) {
      throw new SyncError(`${set.path_template.replaceAll('{lang}', lang)}: ${(error as Error).message}`)
    }

    for (const { path, value } of entries) {
      if (set.format === 'flat' && path.length !== 1) {
        throw new SyncError(`${lang}: в плоском формате вложенный ключ «${path.join(' → ')}»`)
      }
      const key = legacyKey(prefix, path)
      const row = rows.get(key) ?? { technical_key: key, legacy_path: path, translations: {} }
      if (JSON.stringify(row.legacy_path) !== JSON.stringify(path)) {
        throw new SyncError(`Разные пути «${row.legacy_path.join(' → ')}» и «${path.join(' → ')}» дают один ключ ${key}`)
      }
      row.translations[lang] = value
      rows.set(key, row)
    }
  }

  const { data, error } = await db.rpc('import_legacy', {
    p_set: setName,
    p_rows: [...rows.values()],
    p_templates: files,
    p_source_ref: sourceRef ?? null,
    p_actor: actor,
    p_source: 'import'
  })
  if (error) throw error
  return data as ImportReport
}

async function loadKeys(db: SupabaseClient, set: ExportSet): Promise<KeyRow[]> {
  const prefixes = [...new Set([set.legacy_prefix, ...set.include_prefixes].filter((p): p is string => !!p))]
  const rows = new Map<string, KeyRow>()
  for (const prefix of prefixes) {
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await db
        .from('localizations')
        .select('technical_key, translations, legacy_path')
        .is('deprecated_at', null)
        .like('technical_key', `${escapeLike(prefix)}%`)
        .order('technical_key')
        .range(from, from + PAGE - 1)
      if (error) throw error
      for (const row of data as KeyRow[]) {
        if (row.technical_key.startsWith(prefix)) rows.set(row.technical_key, row)
      }
      if (data.length < PAGE) break
    }
  }
  return [...rows.values()]
}

/** Файлы набора: шаблоны с изменившимися строками; без шаблона — собранные заново. */
export async function exportSet(db: SupabaseClient, setName: string): Promise<ExportResult> {
  const set = await loadSet(db, setName)
  const [templates, keys] = await Promise.all([
    db.from('export_templates').select('lang, content').eq('set_name', setName),
    loadKeys(db, set)
  ])
  if (templates.error) throw templates.error
  const templateFor = new Map((templates.data as { lang: string, content: string }[]).map(t => [t.lang, t.content]))

  const files = set.languages.map((lang) => {
    const entries: LocaleEntry[] = keys
      .filter(row => lang in row.translations)
      .map(row => ({ path: filePath(row.technical_key, set.format, row.legacy_path), value: row.translations[lang]! }))

    const path = set.path_template.replaceAll('{lang}', lang)
    let content: string
    try {
      content = renderLocaleFile({ template: templateFor.get(lang), entries, finalNewline: set.final_newline })
    } catch (error) {
      // Например, новый ключ совпал со старым: выгрузка падает, а не перезаписывает молча
      throw new SyncError(`${path}: ${(error as Error).message}`, 409)
    }
    return { lang, path, content, sha256: sha256(content) }
  })

  const revision = sha256(files.map(f => `${f.path}:${f.sha256}`).join('\n')).slice(0, 12)
  return { set: set.name, revision, files }
}
