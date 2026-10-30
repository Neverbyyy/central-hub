// Что поменялось в файле локали: для окна «В проекты» и описания PR.

import { readLocaleFile, type LocaleEntry } from './locale-file'

export interface LocaleChange {
  // Путь в файле, как его пишут в коде: settings.auth.email
  key: string
  before: string | null | undefined
  after: string | null | undefined
}

export interface LocaleChanges {
  added: LocaleChange[]
  changed: LocaleChange[]
  removed: LocaleChange[]
}

// При дубле ключа vue-i18n берёт последнее значение — сравниваем так же
const toMap = (entries: LocaleEntry[]) => new Map(entries.map(e => [JSON.stringify(e.path), e]))

/** Добавленные, изменённые и удалённые строки между двумя версиями файла. Файла не было — oldText = null. */
export function describeLocaleChanges(oldText: string | null, newText: string): LocaleChanges {
  const before = toMap(oldText === null ? [] : readLocaleFile(oldText))
  const after = toMap(readLocaleFile(newText))
  const result: LocaleChanges = { added: [], changed: [], removed: [] }

  for (const [id, entry] of after) {
    const old = before.get(id)
    const key = entry.path.join('.')
    if (!old) result.added.push({ key, before: undefined, after: entry.value })
    else if (old.value !== entry.value) result.changed.push({ key, before: old.value, after: entry.value })
  }
  for (const [id, entry] of before) {
    if (!after.has(id)) result.removed.push({ key: entry.path.join('.'), before: entry.value, after: undefined })
  }
  return result
}
