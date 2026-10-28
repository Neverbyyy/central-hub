// Ключи: создание, поиск, похожие строки, черновые переводы ИИ.
// Без Nuxt-глобалов: общий для маршрутов интерфейса, MCP и тестов базы.

import type { SupabaseClient } from '@supabase/supabase-js'
import { checkText, keyError, MAX_VALUE_LENGTH, type KeyContext, type RegistryKind, type TextIssue } from '@amaya/l10n-core'
import { HubError } from './errors'

export type KeyStatus = 'draft' | 'ai' | 'approved'
export type KeySource = 'ui' | 'mcp'

export const REGISTRY_KINDS: RegistryKind[] = ['game', 'site', 'brand', 'test', 'project']

export interface CreateKeyInput {
  key: string
  description: string
  // Тексты по языкам; обычно только en
  translations: Record<string, string>
  tags?: string[]
  maxLength?: number | null
}

export interface SimilarString {
  technical_key: string
  en: string | null
  score: number
  matched: 'text' | 'key'
}

interface KeyRow {
  technical_key: string
  translations: Record<string, string | null>
  status: Record<string, KeyStatus>
  based_on: Record<string, number>
  source_rev: number
  description: string | null
  tags: string[]
  max_length: number | null
  deprecated_at: string | null
  updated_at: string
  updated_by: string | null
}

const PAGE = 1000

// _ и % — обычные символы, а не шаблоны LIKE
const escapeLike = (value: string) => value.replace(/[\\%_]/g, char => `\\${char}`)

/** Справочник и языки — то, по чему проверяется имя ключа. */
export async function loadKeyContext(db: SupabaseClient): Promise<KeyContext> {
  const [registry, languages] = await Promise.all([
    db.from('registry').select('kind, code'),
    db.from('languages').select('code').order('position')
  ])
  if (registry.error) throw registry.error
  if (languages.error) throw languages.error
  const byKind: KeyContext['registry'] = {}
  for (const { kind, code } of registry.data as { kind: RegistryKind, code: string }[]) {
    byKind[kind] = [...(byKind[kind] ?? []), code]
  }
  return { registry: byKind, languages: (languages.data as { code: string }[]).map(l => l.code) }
}

function normalizeTags(tags: unknown): string[] {
  if (tags === undefined || tags === null) return []
  if (!Array.isArray(tags) || !tags.every(t => typeof t === 'string')) throw new HubError('Теги — список строк')
  const clean = [...new Set(tags.map(t => t.trim()).filter(Boolean))]
  if (clean.length > 20) throw new HubError('Не больше 20 тегов')
  const long = clean.find(t => t.length > 40)
  if (long) throw new HubError(`Тег «${long}» длиннее 40 символов`)
  return clean
}

export async function createKey(
  db: SupabaseClient,
  input: CreateKeyInput,
  { actor, source, status }: { actor: string, source: KeySource, status: KeyStatus }
) {
  const key = input.key.trim()
  const context = await loadKeyContext(db)
  const nameError = keyError(key, context)
  if (nameError) throw new HubError(nameError)
  if (key.startsWith('legacy.')) throw new HubError('Ключи legacy.* приходят только импортом файлов проекта')

  const description = input.description?.trim() ?? ''
  if (description.length < 10) {
    throw new HubError('Нужно описание: где показывается строка и какие у неё ограничения (от 10 символов)')
  }

  const translations: Record<string, string> = {}
  for (const [lang, value] of Object.entries(input.translations ?? {})) {
    if (!context.languages.includes(lang)) throw new HubError(`Неизвестный язык «${lang}»`)
    if (typeof value !== 'string') throw new HubError(`Текст «${lang}» должен быть строкой`)
    if (value.length > MAX_VALUE_LENGTH) throw new HubError(`Текст «${lang}» длиннее ${MAX_VALUE_LENGTH} символов`)
    if (value) translations[lang] = value
  }

  const maxLength = input.maxLength ?? null
  if (maxLength !== null && (!Number.isInteger(maxLength) || maxLength < 1 || maxLength > 10_000)) {
    throw new HubError('Лимит длины — целое число от 1 до 10 000')
  }

  const { data, error } = await db.rpc('create_key', {
    p_key: key,
    p_description: description,
    p_translations: translations,
    p_tags: normalizeTags(input.tags),
    p_max_length: maxLength,
    p_status: status,
    p_actor: actor,
    p_source: source
  })
  if (error?.code === '23505') throw new HubError(`Ключ «${key}» уже есть`, 409)
  if (error) throw error
  return { key, created_at: data as string }
}

export async function findSimilar(db: SupabaseClient, { text, key, limit = 8 }: { text?: string, key?: string, limit?: number }) {
  if (!text?.trim() && !key?.trim()) return []
  const { data, error } = await db.rpc('find_similar', { p_text: text?.trim() ?? '', p_key: key?.trim() ?? '', p_limit: limit })
  if (error) throw error
  return (data as SimilarString[]).map(s => ({ ...s, score: Math.round(s.score * 100) / 100 }))
}

/** Строки по тексту на любом языке или по ключу (индекс search_text). */
export async function searchStrings(
  db: SupabaseClient,
  { query, prefix, tag, limit = 20 }: { query?: string, prefix?: string, tag?: string, limit?: number }
) {
  let request = db
    .from('localizations')
    .select('technical_key, translations, description, tags')
    .is('deprecated_at', null)
    .order('technical_key')
    .limit(Math.min(Math.max(limit, 1), 50))
  if (query?.trim()) request = request.ilike('search_text', `%${escapeLike(query.trim().toLowerCase())}%`)
  if (prefix?.trim()) request = request.like('technical_key', `${escapeLike(prefix.trim())}%`)
  if (tag?.trim()) request = request.contains('tags', [tag.trim()])
  const { data, error } = await request
  if (error) throw error
  return (data as Pick<KeyRow, 'technical_key' | 'translations' | 'description' | 'tags'>[]).map(row => ({
    key: row.technical_key,
    en: row.translations.en ?? null,
    languages: Object.keys(row.translations),
    description: row.description,
    tags: row.tags
  }))
}

const staleLanguages = (row: Pick<KeyRow, 'translations' | 'based_on' | 'source_rev'>) =>
  Object.entries(row.based_on)
    .filter(([lang, rev]) => rev < row.source_rev && row.translations[lang])
    .map(([lang]) => lang)

/** Всё о строке: тексты, статусы, что не переведено и что устарело после правки английского. */
export async function getString(db: SupabaseClient, key: string) {
  const [row, context] = await Promise.all([
    db.from('localizations')
      .select('technical_key, translations, status, based_on, source_rev, description, tags, max_length, deprecated_at, updated_at, updated_by')
      .eq('technical_key', key)
      .maybeSingle(),
    loadKeyContext(db)
  ])
  if (row.error) throw row.error
  if (!row.data) throw new HubError(`Ключ «${key}» не найден`, 404)
  const data = row.data as KeyRow
  return {
    key: data.technical_key,
    description: data.description,
    tags: data.tags,
    max_length: data.max_length,
    deprecated: !!data.deprecated_at,
    translations: data.translations,
    status: data.status,
    missing: context.languages.filter(lang => !data.translations[lang]),
    stale: staleLanguages(data),
    updated_at: data.updated_at,
    updated_by: data.updated_by
  }
}

async function allKeys<T>(db: SupabaseClient, columns: string, prefix?: string): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE) {
    let request = db.from('localizations').select(columns).is('deprecated_at', null).order('technical_key').range(from, from + PAGE - 1)
    if (prefix?.trim()) request = request.like('technical_key', `${escapeLike(prefix.trim())}%`)
    const { data, error } = await request
    if (error) throw error
    rows.push(...(data as T[]))
    if (data.length < PAGE) return rows
  }
}

/** Дерево ключей от общего к частному: сегменты после prefix и сколько ключей внутри. */
export async function keyTree(db: SupabaseClient, { prefix = '', depth = 1 }: { prefix?: string, depth?: number }) {
  const base = prefix && !prefix.endsWith('.') ? `${prefix}.` : prefix
  const keys = await allKeys<{ technical_key: string }>(db, 'technical_key', base)
  const counts = new Map<string, number>()
  for (const { technical_key: key } of keys) {
    const rest = key.slice(base.length).split('.')
    const node = base + rest.slice(0, Math.min(Math.max(depth, 1), rest.length)).join('.')
    counts.set(node, (counts.get(node) ?? 0) + 1)
  }
  return [...counts].map(([path, count]) => ({ path, keys: count }))
}

export interface TreeNode {
  // Начало ключа, например app.cars2
  path: string
  label: string
  keys: number
  children: TreeNode[]
}

/** Разделы ключей для дерева в интерфейсе: только узлы, у которых есть строки внутри, до maxDepth уровней. */
export async function keyTreeNested(db: SupabaseClient, { maxDepth = 4 } = {}): Promise<TreeNode[]> {
  const keys = await allKeys<{ technical_key: string }>(db, 'technical_key')
  const root: TreeNode = { path: '', label: '', keys: 0, children: [] }
  const nodes = new Map<string, TreeNode>()

  for (const { technical_key: key } of keys) {
    const segments = key.split('.')
    let parent = root
    // Последний сегмент — сама строка; в дерево идут только разделы
    for (let i = 0; i < Math.min(segments.length - 1, maxDepth); i++) {
      const path = segments.slice(0, i + 1).join('.')
      let node = nodes.get(path)
      if (!node) {
        node = { path, label: segments[i]!, keys: 0, children: [] }
        nodes.set(path, node)
        parent.children.push(node)
      }
      node.keys++
      parent = node
    }
  }

  const sort = (list: TreeNode[]) => {
    list.sort((a, b) => a.label.localeCompare(b.label))
    for (const node of list) sort(node.children)
  }
  sort(root.children)
  return root.children
}

export async function listRegistry(db: SupabaseClient, kind?: string) {
  let request = db.from('registry').select('kind, code, title').order('kind').order('code')
  if (kind) request = request.eq('kind', kind)
  const { data, error } = await request
  if (error) throw error
  return data as { kind: RegistryKind, code: string, title: string }[]
}

export async function addRegistryCode(db: SupabaseClient, { kind, code, title }: { kind: string, code: string, title: string }) {
  if (!REGISTRY_KINDS.includes(kind as RegistryKind)) throw new HubError(`Неизвестный раздел справочника «${kind}»`)
  if (kind === 'project') throw new HubError('Проекты добавляются вместе с набором выгрузки, не из формы')
  if (!/^[a-z0-9_]+$/.test(code)) throw new HubError('Код — строчная латиница, цифры и _')
  if (!title?.trim()) throw new HubError('Нужно название')
  const { error } = await db.from('registry').insert({ kind, code, title: title.trim().slice(0, 80) })
  if (error?.code === '23505') throw new HubError(`Код «${code}» уже есть в справочнике`, 409)
  if (error) throw error
  return { kind, code, title: title.trim() }
}

export interface QueueItem {
  key: string
  en: string
  // Текущий перевод — есть у устаревших
  current: string | null
  reason: 'missing' | 'stale'
  description: string | null
  max_length: number | null
}

/** Очередь перевода: строки с английским, но без перевода на язык или с устаревшим переводом. */
export async function translationQueue(
  db: SupabaseClient,
  { lang, prefix, limit = 50 }: { lang: string, prefix?: string, limit?: number }
): Promise<{ total: number, items: QueueItem[] }> {
  const context = await loadKeyContext(db)
  if (!context.languages.includes(lang)) throw new HubError(`Неизвестный язык «${lang}»`)
  if (lang === 'en') throw new HubError('Английский — исходный язык, его не переводят')

  const rows = await allKeys<KeyRow>(db, 'technical_key, translations, based_on, source_rev, description, max_length', prefix)
  const items: QueueItem[] = []
  for (const row of rows) {
    if (!row.translations.en) continue
    const reason = !row.translations[lang] ? 'missing' : staleLanguages(row).includes(lang) ? 'stale' : null
    if (!reason) continue
    items.push({
      key: row.technical_key,
      en: row.translations.en,
      current: row.translations[lang] ?? null,
      reason,
      description: row.description,
      max_length: row.max_length
    })
  }
  return { total: items.length, items: items.slice(0, Math.min(Math.max(limit, 1), 200)) }
}

/** Ключи без перевода на язык или с переводом, устаревшим после правки английского. */
export async function listUntranslated(db: SupabaseClient, { lang, prefix, limit = 20 }: { lang: string, prefix?: string, limit?: number }) {
  const { items } = await translationQueue(db, { lang, prefix, limit: Math.min(Math.max(limit, 1), 100) })
  return items
}

/** Проверка текста строки или перевода по правилам ТЗ; source и лимит берутся из ключа. */
export async function checkKeyText(db: SupabaseClient, { text, key, lang }: { text: string, key?: string, lang?: string }): Promise<TextIssue[]> {
  if (!key) return checkText({ text, isNew: true })
  const row = await getString(db, key)
  const source = lang && lang !== 'en' ? row.translations.en : null
  return checkText({ text, source, maxLength: row.max_length, isNew: !key.startsWith('legacy.') })
}

/** Черновой перевод нейросети: ошибки проверки блокируют, человеческий текст не перезаписывается (база). */
export async function writeAiTranslation(db: SupabaseClient, { key, lang, text, actor }: { key: string, lang: string, text: string, actor: string }) {
  const issues = await checkKeyText(db, { text, key, lang })
  const errors = issues.filter(i => i.level === 'error')
  if (errors.length) throw new HubError(`Перевод не сохранён: ${errors.map(e => e.message).join('; ')}`)

  const { data, error } = await db.rpc('set_ai_translation', { p_key: key, p_lang: lang, p_value: text, p_actor: actor })
  if (error) throw error
  return { key, lang, updated_at: data as string, warnings: issues.map(i => i.message) }
}
