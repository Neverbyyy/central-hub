// Теги ключей: одно правило имени для страницы «Теги», меню правого клика, форм ключа и сервера.
// То же держит база (миграция 20261112100000_tags): check у таблицы tags и проверка тегов у ключа

export const MAX_TAG_LENGTH = 40
export const MAX_TAGS_PER_KEY = 20

export type TagNameProblem = 'empty' | 'tooLong' | 'comma'

/** Что не так с именем тега; null — можно. Запятая запрещена: через неё теги идут в адресе фильтра (?tags=a,b). */
export function tagNameProblem(name: string): TagNameProblem | null {
  const value = name.trim()
  if (!value) return 'empty'
  if (value.length > MAX_TAG_LENGTH) return 'tooLong'
  if (value.includes(',')) return 'comma'
  return null
}

// Текст для сервера (ошибка API, MCP); интерфейс берёт его из словаря — tagNameText в app/utils/tags.ts
const PROBLEM_TEXT: Record<TagNameProblem, string> = {
  empty: 'Нужно название тега',
  tooLong: `Тег длиннее ${MAX_TAG_LENGTH} символов`,
  comma: 'В названии тега не может быть запятой'
}

/** Что не так с именем тега — по-русски, для сервера; null — можно. */
export function tagNameError(name: string): string | null {
  const problem = tagNameProblem(name)
  return problem && PROBLEM_TEXT[problem]
}

/** Есть ли такой тег без учёта регистра: «Landing» и «landing» — один тег. Возвращает имя из списка. */
export const findTag = (tags: readonly string[], name: string) => {
  const lower = name.trim().toLowerCase()
  return tags.find(tag => tag.toLowerCase() === lower)
}
