// Меню тегов: что отмечать и что показывать по запросу. Чистые функции — состояние в composables/useTags.ts

/** Сколько ключей уже с тегом: all — у всех (галочка), count — для «2 из 5». */
export function tagCoverage(lists: readonly (readonly string[])[], tag: string) {
  const count = lists.filter(list => list.includes(tag)).length
  return { count, all: lists.length > 0 && count === lists.length }
}

/** Список тегов, где тег поставлен (on) или снят; новый — в конец, как его добавляет база. */
export function withTag(tags: readonly string[], tag: string, on: boolean): string[] {
  if (on) return tags.includes(tag) ? [...tags] : [...tags, tag]
  return tags.filter(t => t !== tag)
}

/** Теги с сервера, поверх — правки из меню, которых сервер ещё не подтвердил (тег → поставить или снять). */
export function overlayTags(server: readonly string[], ops: ReadonlyMap<string, { on: boolean }>): string[] {
  let tags = [...server]
  for (const [tag, { on }] of ops) tags = withTag(tags, tag, on)
  return tags
}

/**
 * Время из timestamptz базы в мс: «2026-11-13T00:12:34.123456+00:00» (PostgREST) и «2026-11-13 00:12:34.123456+00»
 * (так его может прислать Realtime; Safari такую строку сам не разбирает). Не разобралось — NaN.
 */
export function dbTime(value: string | null | undefined): number {
  if (!value) return Number.NaN
  return Date.parse(value.replace(' ', 'T').replace(/([+-]\d\d)$/, '$1:00'))
}

/** Теги под запрос без учёта регистра: сначала начинающиеся с него, потом остальные совпадения. */
export function filterTags(tags: readonly string[], query: string): string[] {
  const term = query.trim().toLowerCase()
  if (!term) return [...tags]
  const matches = tags.filter(tag => tag.toLowerCase().includes(term))
  const starts = matches.filter(tag => tag.toLowerCase().startsWith(term))
  return [...starts, ...matches.filter(tag => !starts.includes(tag))]
}
