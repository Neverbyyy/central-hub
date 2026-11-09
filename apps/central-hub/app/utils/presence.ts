// Присутствие коллег: кто сейчас в сервисе и что правит. Чистые функции — состояние в composables/usePresence.ts

export interface PresenceCell {
  key: string
  lang: string
}

export interface PresenceMeta {
  name: string
  // Где человек: название страницы
  page: string
  // Какую ячейку правит (ключ и язык) или null
  editing: PresenceCell | null
}

export interface PresencePerson extends PresenceMeta {
  // Вкладка: у одного человека их бывает несколько
  tab: string
}

// Насыщенные цвета, на которых читается белый текст, — и в светлой, и в тёмной теме
const COLORS = ['#2563eb', '#db2777', '#059669', '#d97706', '#7c3aed', '#dc2626', '#0891b2', '#65a30d']

/** Цвет человека по имени: один и тот же в шапке и на метке ячейки, у всех коллег одинаковый. */
export function presenceColor(name: string): string {
  let hash = 0
  for (const char of name) hash = (hash * 31 + char.codePointAt(0)!) >>> 0
  return COLORS[hash % COLORS.length]!
}

const isCell = (value: unknown): value is PresenceCell =>
  !!value && typeof (value as PresenceCell).key === 'string' && typeof (value as PresenceCell).lang === 'string'

/**
 * Состояние канала присутствия → люди. Пришло от чужих вкладок, поэтому проверяем форму: запись без имени
 * пропускаем, непонятную ячейку считаем «ничего не правит». У вкладки берём последнее состояние.
 */
export function presencePeople(state: Record<string, unknown[]>): PresencePerson[] {
  return Object.entries(state).flatMap(([tab, metas]) => {
    const last = metas[metas.length - 1] as Partial<PresenceMeta> | undefined
    if (!last || typeof last.name !== 'string' || !last.name.trim()) return []
    return [{ tab, name: last.name.trim(), page: typeof last.page === 'string' ? last.page : '', editing: isCell(last.editing) ? { key: last.editing.key, lang: last.editing.lang } : null }]
  })
}

/** Другие люди — без своих вкладок и тёзок: одно имя — один человек, у кого есть правка — тот и показан. */
export function presenceOthers(people: PresencePerson[], self: { tab: string, name: string | null }): PresencePerson[] {
  const byName = new Map<string, PresencePerson>()
  for (const person of people) {
    if (person.tab === self.tab || person.name === self.name) continue
    const seen = byName.get(person.name)
    if (!seen || (!seen.editing && person.editing)) byName.set(person.name, person)
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name, 'ru'))
}

/** Кто что правит: ключ → язык → имена (без себя). */
export function presenceEditors(people: PresencePerson[], self: { tab: string, name: string | null }): Record<string, Record<string, string[]>> {
  const map: Record<string, Record<string, string[]>> = {}
  for (const person of people) {
    if (!person.editing || person.tab === self.tab || person.name === self.name) continue
    const langs = (map[person.editing.key] ??= {})
    const names = (langs[person.editing.lang] ??= [])
    if (!names.includes(person.name)) names.push(person.name)
  }
  return map
}

/** Метка на ячейке: «Антон правит DE», двое и больше — «Антон +1 правят DE». */
export function presenceLabel(names: string[], lang: string): string {
  const who = names.length > 1 ? `${names[0]} +${names.length - 1}` : names[0]
  return `${who} ${names.length > 1 ? 'правят' : 'правит'} ${lang.toUpperCase()}`
}
