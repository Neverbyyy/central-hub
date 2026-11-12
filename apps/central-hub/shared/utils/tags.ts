// Теги ключей: одно правило имени для страницы «Теги», меню правого клика, форм ключа и сервера.
// То же держит база (миграция 20261112100000_tags): check у таблицы tags и проверка тегов у ключа

export const MAX_TAG_LENGTH = 40
export const MAX_TAGS_PER_KEY = 20

/** Что не так с именем тега; null — можно. Запятая запрещена: через неё теги идут в адресе фильтра (?tags=a,b). */
export function tagNameError(name: string): string | null {
  const value = name.trim()
  if (!value) return 'Нужно название тега'
  if (value.length > MAX_TAG_LENGTH) return `Тег длиннее ${MAX_TAG_LENGTH} символов`
  if (value.includes(',')) return 'В названии тега не может быть запятой'
  return null
}

/** Есть ли такой тег без учёта регистра: «Landing» и «landing» — один тег. Возвращает имя из списка. */
export const findTag = (tags: readonly string[], name: string) => {
  const lower = name.trim().toLowerCase()
  return tags.find(tag => tag.toLowerCase() === lower)
}
