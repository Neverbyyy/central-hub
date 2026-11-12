// Меню тегов: что отмечать и что показывать по запросу. Чистые функции — состояние в composables/useTags.ts

/** Сколько ключей уже с тегом: all — у всех (галочка), count — для «2 из 5». */
export function tagCoverage(lists: readonly (readonly string[])[], tag: string) {
  const count = lists.filter(list => list.includes(tag)).length
  return { count, all: lists.length > 0 && count === lists.length }
}

/** Теги под запрос без учёта регистра: сначала начинающиеся с него, потом остальные совпадения. */
export function filterTags(tags: readonly string[], query: string): string[] {
  const term = query.trim().toLowerCase()
  if (!term) return [...tags]
  const matches = tags.filter(tag => tag.toLowerCase().includes(term))
  const starts = matches.filter(tag => tag.toLowerCase().startsWith(term))
  return [...starts, ...matches.filter(tag => !starts.includes(tag))]
}
