// Ключи: создание, поиск, похожие строки, черновые переводы ИИ.
// Без Nuxt-глобалов: общий для маршрутов интерфейса, MCP и тестов базы.

import type { SupabaseClient } from '@supabase/supabase-js'
import { checkText, descriptionError, escapeLike, figmaUrlError, isRegistryCode, MAX_LENGTH_LIMIT, MAX_VALUE_LENGTH, newKeyError, REGISTRY_KINDS, type KeyContext, type RegistryKind, type TextIssue } from '@amaya/l10n-core'
import { MAX_TAGS_PER_KEY, tagNameError } from '../../shared/utils/tags'
import { HubError } from './errors'
import { fetchAllPages } from './paging'

export type KeyStatus = 'draft' | 'ai' | 'approved'
export type KeySource = 'ui' | 'mcp'

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
  // Переводы, устаревшие после правки английского — считает база (английский сейчас другой, чем при переводе)
  stale_langs: string[]
  description: string | null
  tags: string[]
  max_length: number | null
  deprecated_at: string | null
  updated_at: string
  updated_by: string | null
}

/** Коды языков в порядке грида; editorOnly — только видимые в редакторе (режимы Figma). */
export async function loadLanguages(db: SupabaseClient, { editorOnly = false } = {}): Promise<string[]> {
  let request = db.from('languages').select('code').order('position')
  if (editorOnly) request = request.eq('in_editor', true)
  const { data, error } = await request
  if (error) throw error
  return (data as { code: string }[]).map(l => l.code)
}

const unknownLanguage = (lang: string) => new HubError(`Неизвестный язык «${lang}»`)

/** Справочник и языки — то, по чему проверяется имя ключа. */
export async function loadKeyContext(db: SupabaseClient): Promise<KeyContext> {
  const [registry, languages] = await Promise.all([db.from('registry').select('kind, code'), loadLanguages(db)])
  if (registry.error) throw registry.error
  const byKind: KeyContext['registry'] = {}
  for (const { kind, code } of registry.data as { kind: RegistryKind, code: string }[]) {
    byKind[kind] = [...(byKind[kind] ?? []), code]
  }
  return { registry: byKind, languages }
}

// Теги ключа: только из списка «Теги» — это проверяет база (триггер localizations_check_tags)
function normalizeTags(tags: unknown): string[] {
  if (tags === undefined || tags === null) return []
  if (!Array.isArray(tags) || !tags.every(t => typeof t === 'string')) throw new HubError('Теги — список строк')
  const clean = [...new Set(tags.map(t => t.trim()).filter(Boolean))]
  if (clean.length > MAX_TAGS_PER_KEY) throw new HubError(`Не больше ${MAX_TAGS_PER_KEY} тегов`)
  for (const tag of clean) {
    const message = tagNameError(tag)
    if (message) throw new HubError(`${message}: «${tag}»`)
  }
  return clean
}

function parseMaxLength(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > MAX_LENGTH_LIMIT) {
    throw new HubError('Лимит длины — целое число от 1 до 10 000')
  }
  return value
}

export async function createKey(
  db: SupabaseClient,
  input: CreateKeyInput,
  { actor, source, status }: { actor: string, source: KeySource, status: KeyStatus }
) {
  const key = input.key.trim()
  const context = await loadKeyContext(db)
  // Те же правила проверяет форма в интерфейсе — packages/l10n-core
  const nameError = newKeyError(key, context)
  if (nameError) throw new HubError(nameError)

  const description = input.description?.trim() ?? ''
  const descriptionMessage = descriptionError(description)
  if (descriptionMessage) throw new HubError(descriptionMessage)

  const translations: Record<string, string> = {}
  for (const [lang, value] of Object.entries(input.translations ?? {})) {
    if (!context.languages.includes(lang)) throw unknownLanguage(lang)
    if (typeof value !== 'string') throw new HubError(`Текст «${lang}» должен быть строкой`)
    if (value.length > MAX_VALUE_LENGTH) throw new HubError(`Текст «${lang}» длиннее ${MAX_VALUE_LENGTH} символов`)
    if (value) translations[lang] = value
  }

  const maxLength = parseMaxLength(input.maxLength)

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

export interface KeyMetaInput {
  key: string
  description?: unknown
  tags?: unknown
  maxLength?: unknown
  figmaUrl?: unknown
}

/** Свойства существующего ключа: описание, теги, лимит, ссылка на Figma. Тексты не трогает. */
export async function updateKeyMeta(db: SupabaseClient, input: KeyMetaInput, { actor }: { actor: string }) {
  const key = input.key.trim()
  if (!key) throw new HubError('Нужен ключ')

  if (input.description !== undefined && input.description !== null && typeof input.description !== 'string') {
    throw new HubError('Описание — строка')
  }
  const description = (input.description as string | null | undefined)?.trim() ?? ''
  // У строк InApp и Pages Hub описания с импорта нет — их можно оставить без него, у остальных оно обязательно
  if (!key.startsWith('legacy.')) {
    const message = descriptionError(description)
    if (message) throw new HubError(message)
  }

  if (input.figmaUrl !== undefined && input.figmaUrl !== null && typeof input.figmaUrl !== 'string') {
    throw new HubError('Ссылка на Figma — строка')
  }
  const figmaUrl = (input.figmaUrl as string | null | undefined)?.trim() ?? ''
  const figmaMessage = figmaUrlError(figmaUrl)
  if (figmaMessage) throw new HubError(figmaMessage)

  const { data, error } = await db.rpc('update_key_meta', {
    p_key: key,
    p_description: description,
    p_tags: normalizeTags(input.tags),
    p_max_length: parseMaxLength(input.maxLength),
    p_figma_url: figmaUrl,
    p_actor: actor
  })
  if (error) throw error
  return { updated_at: data as string }
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

/** Всё о строке: тексты, статусы, что не переведено и что устарело после правки английского. */
export async function getString(db: SupabaseClient, key: string) {
  const [row, languages] = await Promise.all([
    db.from('localizations')
      .select('technical_key, translations, status, stale_langs, description, tags, max_length, deprecated_at, updated_at, updated_by')
      .eq('technical_key', key)
      .maybeSingle(),
    loadLanguages(db)
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
    missing: languages.filter(lang => !data.translations[lang]),
    stale: data.stale_langs,
    updated_at: data.updated_at,
    updated_by: data.updated_by
  }
}

/**
 * Все действующие ключи (или ключи раздела) постранично — PostgREST отдаёт не больше 1000 строк за раз.
 * С since — только изменённые с этого момента, включая помеченные устаревшими.
 */
export function allKeys<T>(db: SupabaseClient, columns: string, prefix?: string, { since }: { since?: string } = {}): Promise<T[]> {
  return fetchAllPages<T>((from, to) => {
    let request = db.from('localizations').select(columns).order('technical_key').range(from, to)
    request = since ? request.gte('updated_at', since) : request.is('deprecated_at', null)
    if (prefix?.trim()) request = request.like('technical_key', `${escapeLike(prefix.trim())}%`)
    return request
  })
}

/**
 * Ключи нескольких разделов без повторов (раздел может лежать внутри другого). Разделы читаются параллельно,
 * а порядок — как у разделов: от него зависит порядок строк в файлах выгрузки без шаблона.
 */
export async function keysByPrefixes<T extends { technical_key: string }>(
  db: SupabaseClient,
  columns: string,
  prefixes: readonly string[],
  options: { since?: string } = {}
): Promise<T[]> {
  const pages = await Promise.all(prefixes.map(prefix => allKeys<T>(db, columns, prefix, options)))
  const rows = new Map<string, T>()
  for (const row of pages.flat()) rows.set(row.technical_key, row)
  return [...rows.values()]
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

/**
 * Разделы ключей для дерева в интерфейсе: только узлы, у которых есть строки внутри, до maxDepth уровней. Сколько
 * ключей в каждом разделе, считает база (key_sections) — одним запросом, а не чтением всех ключей страницами.
 */
export async function keyTreeNested(db: SupabaseClient, { maxDepth = 4 } = {}): Promise<TreeNode[]> {
  const { data, error } = await db.rpc('key_sections', { p_max_depth: maxDepth })
  if (error) throw error
  const sections = (data as { path: string, keys: number }[])
    // Родитель — раньше детей: путь родителя — начало пути ребёнка
    .sort((a, b) => a.path.split('.').length - b.path.split('.').length)

  const root: TreeNode = { path: '', label: '', keys: 0, children: [] }
  const nodes = new Map<string, TreeNode>()
  for (const { path, keys } of sections) {
    const cut = path.lastIndexOf('.')
    const node: TreeNode = { path, label: path.slice(cut + 1), keys: Number(keys), children: [] }
    nodes.set(path, node)
    const parent = cut < 0 ? root : nodes.get(path.slice(0, cut))
    parent?.children.push(node)
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
  if (!(REGISTRY_KINDS as readonly string[]).includes(kind)) throw new HubError(`Неизвестный раздел справочника «${kind}»`)
  if (kind === 'project') throw new HubError('Проекты добавляются вместе с набором выгрузки, не из формы')
  if (!isRegistryCode(code)) throw new HubError('Код — строчная латиница, цифры и _')
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

const QUEUE_COLUMNS = 'technical_key, translations, stale_langs, description, max_length'

/**
 * Строки очереди языка — фильтром в базе, без чтения всех ключей: действующий ключ раздела, английский не пустой,
 * а перевода нет (пустая строка — тоже нет) или он устарел после правки английского. Те же условия — у счётчиков
 * (queue_counts в базе). lang попадает в текст фильтра, поэтому сюда приходит лишь код из таблицы языков.
 */
function queueRequest(db: SupabaseClient, lang: string, { prefix }: { prefix?: string }) {
  const text = `translations->>${lang}`
  let request = db.from('localizations')
    .select(QUEUE_COLUMNS, { count: 'exact' })
    .is('deprecated_at', null)
    // NULL <> '' — не истина: без английского строка в очередь не попадает
    .neq('translations->>en', '')
  if (prefix?.trim()) request = request.like('technical_key', `${escapeLike(prefix.trim())}%`)
  return request.or(`${text}.is.null,${text}.eq."",stale_langs.cs.{${lang}}`)
}

/** Очередь перевода: строки с английским, но без перевода на язык или с устаревшим переводом. */
export async function translationQueue(
  db: SupabaseClient,
  { lang, prefix, limit = 50 }: { lang: string, prefix?: string, limit?: number }
): Promise<{ total: number, items: QueueItem[] }> {
  const languages = await loadLanguages(db)
  if (!languages.includes(lang)) throw unknownLanguage(lang)
  if (lang === 'en') throw new HubError('Английский — исходный язык, его не переводят')

  const size = Math.min(Math.max(limit, 1), 200)
  const { data, error, count } = await queueRequest(db, lang, { prefix }).order('technical_key').range(0, size - 1)
  if (error) throw error
  const items = (data as unknown as Pick<KeyRow, 'technical_key' | 'translations' | 'stale_langs' | 'description' | 'max_length'>[])
    .map(row => ({
      key: row.technical_key,
      en: row.translations.en!,
      current: row.translations[lang] ?? null,
      reason: row.translations[lang] ? 'stale' as const : 'missing' as const,
      description: row.description,
      max_length: row.max_length
    }))
  return { total: count ?? 0, items }
}

/**
 * Размер очереди по каждому языку перевода для меню «Очередь перевода»: один запрос (queue_counts — языки, как
 * в loadLanguages, без английского) с теми же условиями, что у самой очереди (queueRequest). Было по два запроса на
 * язык и ещё один за списком языков.
 */
export async function queueCounts(db: SupabaseClient, { prefix }: { prefix?: string } = {}) {
  const { data, error } = await db.rpc('queue_counts', { p_prefix: prefix?.trim() || null })
  if (error) throw error
  return (data as { lang: string, missing: number, stale: number }[])
    .map(row => ({ lang: row.lang, missing: Number(row.missing), stale: Number(row.stale) }))
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
