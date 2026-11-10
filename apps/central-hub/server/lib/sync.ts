// Импорт файлов локалей проекта в сервис и выгрузка обратно.
// Без Nuxt-глобалов: используется маршрутами /api/cli/* и /api/export/*, и тестами базы.

import { createHash } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { escapeLike, filePath, keyInExportSet, legacyKey, readLocaleFile, renderLocaleFile, type LocaleEntry, type LocaleFormat } from '@amaya/l10n-core'
import { asHubError, HubError } from './errors'
import { keysByPrefixes } from './keys'

export interface ExportSet {
  name: string
  project: string
  format: LocaleFormat
  legacy_prefix: string | null
  include_prefixes: string[]
  // Например служебные ключи автотестов common.selftest.*
  exclude_prefixes: string[]
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

interface ExportKeyRow {
  technical_key: string
  // Последний утверждённый текст по языкам: черновики в проекты не уходят
  approved: Record<string, string | null>
  legacy_path: string[] | null
}

const sha256 = (text: string) => createHash('sha256').update(text).digest('hex')

async function loadSet(db: SupabaseClient, name: string): Promise<ExportSet> {
  const { data, error } = await db.from('export_sets').select('*').eq('name', name).maybeSingle()
  if (error) throw error
  if (!data) throw new HubError(`Нет набора выгрузки «${name}»`, 404)
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
  if (!prefix) throw new HubError(`У набора «${setName}» нет префикса legacy — импортировать некуда`)

  const missing = set.languages.filter(lang => typeof files[lang] !== 'string')
  if (missing.length) throw new HubError(`Не хватает файлов языков: ${missing.join(', ')}`)
  const extra = Object.keys(files).filter(lang => !set.languages.includes(lang))
  if (extra.length) throw new HubError(`Языки не из набора «${setName}»: ${extra.join(', ')}`)

  const rows = new Map<string, { technical_key: string, legacy_path: string[], translations: Record<string, string | null> }>()
  for (const lang of set.languages) {
    const text = files[lang]!
    let entries: LocaleEntry[]
    try {
      entries = readLocaleFile(text)
      // Шаблон, который выгрузка не воспроизводит байт в байт, принимать нельзя
      if (renderLocaleFile({ template: text, entries }) !== text) throw new Error('файл не воспроизводится выгрузкой')
    } catch (error) {
      throw asHubError(error, `${set.path_template.replaceAll('{lang}', lang)}: `)
    }

    for (const { path, value } of entries) {
      if (set.format === 'flat' && path.length !== 1) {
        throw new HubError(`${lang}: в плоском формате вложенный ключ «${path.join(' → ')}»`)
      }
      const key = legacyKey(prefix, path)
      const row = rows.get(key) ?? { technical_key: key, legacy_path: path, translations: {} }
      if (JSON.stringify(row.legacy_path) !== JSON.stringify(path)) {
        throw new HubError(`Разные пути «${row.legacy_path.join(' → ')}» и «${path.join(' → ')}» дают один ключ ${key}`)
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

// Начала ключей набора: свой legacy и, если нужны новые ключи, включённые
const setPrefixes = (set: ExportSet, legacyOnly = false) =>
  [...new Set([set.legacy_prefix, ...(legacyOnly ? [] : set.include_prefixes)].filter((p): p is string => !!p))]

async function loadKeys(db: SupabaseClient, set: ExportSet, legacyOnly: boolean): Promise<ExportKeyRow[]> {
  const rows = await keysByPrefixes<ExportKeyRow>(db, 'technical_key, approved, legacy_path', setPrefixes(set, legacyOnly))
  // То же правило показывает интерфейс: «Выгрузка в код: InApp»
  return rows.filter(row => keyInExportSet(set, row.technical_key))
}

/**
 * Сколько действующих ключей набора ждут утверждения хотя бы на одном языке: их правки в выгрузку не попадут.
 * Набор — именем или уже загруженный (окно «Выгрузка в код» читает все наборы одним запросом).
 */
export async function pendingApproval(db: SupabaseClient, setOrName: string | ExportSet): Promise<number> {
  const set = typeof setOrName === 'string' ? await loadSet(db, setOrName) : setOrName
  const prefixes = setPrefixes(set)
  const count = async (prefix: string) => {
    const { count, error } = await db
      .from('localizations')
      .select('technical_key', { count: 'exact', head: true })
      .is('deprecated_at', null)
      .like('technical_key', `${escapeLike(prefix)}%`)
      .overlaps('status_values', ['draft', 'ai'])
    if (error) throw error
    return count ?? 0
  }
  // Исключённые префиксы лежат внутри включённых — вычитаем
  const excluded = set.exclude_prefixes.filter(e => prefixes.some(p => e.startsWith(p)))
  const [included, skipped] = await Promise.all([Promise.all(prefixes.map(count)), Promise.all(excluded.map(count))])
  return included.reduce((a, b) => a + b, 0) - skipped.reduce((a, b) => a + b, 0)
}

/**
 * Файлы набора: шаблоны с изменившимися строками; без шаблона — собранные заново.
 * Берутся только утверждённые тексты (`approved`): правка без утверждения в проект не попадает.
 * legacyOnly — только строки самого проекта, без новых ключей (так автотест сверяет выгрузку с исходными файлами).
 */
export async function exportSet(db: SupabaseClient, setName: string, { legacyOnly = false } = {}): Promise<ExportResult> {
  const set = await loadSet(db, setName)
  const [templates, keys] = await Promise.all([
    db.from('export_templates').select('lang, content').eq('set_name', setName),
    loadKeys(db, set, legacyOnly)
  ])
  if (templates.error) throw templates.error
  const templateFor = new Map((templates.data as { lang: string, content: string }[]).map(t => [t.lang, t.content]))

  const files = set.languages.map((lang) => {
    const entries: LocaleEntry[] = keys
      .filter(row => lang in row.approved)
      .map(row => ({ path: filePath(row.technical_key, set.format, row.legacy_path), value: row.approved[lang]! }))

    const path = set.path_template.replaceAll('{lang}', lang)
    let content: string
    try {
      content = renderLocaleFile({ template: templateFor.get(lang), entries, finalNewline: set.final_newline })
    } catch (error) {
      // Например, новый ключ совпал со старым: выгрузка падает, а не перезаписывает молча
      throw asHubError(error, `${path}: `, 409)
    }
    return { lang, path, content, sha256: sha256(content) }
  })

  const revision = sha256(files.map(f => `${f.path}:${f.sha256}`).join('\n')).slice(0, 12)
  return { set: set.name, revision, files }
}
