// Присутствие коллег: кто сейчас в сервисе и что правит. Чистые функции — состояние в composables/usePresence.ts

export interface PresenceCell {
  key: string
  lang: string
}

export type PresenceDevice = 'desktop' | 'tablet' | 'phone'

// Что вкладка сообщает о себе через присутствие (track): меняется редко
export interface PresenceMeta {
  name: string
  // Рабочий адрес из Google — по нему узнаём человека; у вкладок прежней версии его нет (null) — тогда по имени
  email: string | null
  // Когда открыл вкладку, мс
  since: number
  device: PresenceDevice
}

export interface PresencePerson extends PresenceMeta {
  // Вкладка: у одного человека их бывает несколько
  tab: string
  // Какую ячейку правит (ключ и язык) или null — приходит сообщением, не через присутствие (usePresence)
  editing: PresenceCell | null
}

const DEVICES: PresenceDevice[] = ['desktop', 'tablet', 'phone']

// Насыщенные цвета, на которых читается белый текст, — и в светлой, и в тёмной теме. Чем их больше,
// тем реже у двух людей один цвет
const COLORS = ['#2563eb', '#db2777', '#059669', '#d97706', '#7c3aed', '#dc2626', '#0891b2', '#65a30d', '#c026d3', '#ea580c', '#4f46e5', '#0d9488']

/** Цвет человека по имени: один и тот же в шапке и на метке ячейки, у всех коллег одинаковый. */
export function presenceColor(name: string): string {
  let hash = 0
  for (const char of name) hash = (hash * 31 + char.codePointAt(0)!) >>> 0
  return COLORS[hash % COLORS.length]!
}

const isCell = (value: unknown): value is PresenceCell =>
  !!value && typeof (value as PresenceCell).key === 'string' && typeof (value as PresenceCell).lang === 'string'

/** Ячейка из сообщения чужой вкладки: только ключ и язык строками, остальное — null. */
export function presenceCell(value: unknown): PresenceCell | null {
  return isCell(value) ? { key: value.key, lang: value.lang } : null
}

/**
 * Состояние канала присутствия → люди. Пришло от чужих вкладок, поэтому проверяем форму: запись без имени
 * пропускаем, непонятную ячейку считаем «ничего не правит». У вкладки берём последнее состояние.
 */
export function presencePeople(state: Record<string, unknown[]>): PresencePerson[] {
  return Object.entries(state).flatMap(([tab, metas]) => {
    const last = metas[metas.length - 1] as Partial<PresenceMeta> | undefined
    if (!last || typeof last.name !== 'string' || !last.name.trim()) return []
    return [{
      tab,
      name: last.name.trim(),
      email: typeof last.email === 'string' && last.email.includes('@') ? last.email.trim().toLowerCase() : null,
      // Что правит — не из присутствия, а из сообщений: usePresence подставит
      editing: null,
      since: typeof last.since === 'number' && Number.isFinite(last.since) ? last.since : 0,
      device: DEVICES.includes(last.device as PresenceDevice) ? last.device as PresenceDevice : 'desktop'
    }]
  })
}

// Эта вкладка и вошедший в ней человек
export interface PresenceSelf {
  tab: string
  name: string | null
  email: string | null
}

/** Кто это: один рабочий адрес — один человек (тёзки различаются); у вкладки без адреса — по имени. */
const personKey = (who: { name: string | null, email: string | null }) => (who.email ? `email:${who.email}` : `name:${who.name ?? ''}`)
const isSelf = (person: PresencePerson, self: PresenceSelf) =>
  person.tab === self.tab || (!!(self.email || self.name) && personKey(person) === personKey(self))

/**
 * Вкладки одного человека — одна запись. Показана вкладка, где он что-то правит (иначе — последняя открытая),
 * «в сервисе с» — от самой ранней вкладки. Порядок — по алфавиту.
 */
function groupByPerson(people: PresencePerson[]): PresencePerson[] {
  const byPerson = new Map<string, PresencePerson>()
  for (const person of people) {
    const key = personKey(person)
    const seen = byPerson.get(key)
    if (!seen) {
      byPerson.set(key, person)
      continue
    }
    const shown = (!seen.editing && person.editing) || (!seen.editing === !person.editing && person.since > seen.since) ? person : seen
    const earliest = [seen.since, person.since].filter(Boolean)
    byPerson.set(key, { ...shown, since: earliest.length ? Math.min(...earliest) : 0 })
  }
  return [...byPerson.values()].sort((a, b) => a.name.localeCompare(b.name, 'ru') || (a.email ?? '').localeCompare(b.email ?? ''))
}

/** Другие люди — без своих вкладок. */
export function presenceOthers(people: PresencePerson[], self: PresenceSelf): PresencePerson[] {
  return groupByPerson(people.filter(person => !isSelf(person, self)))
}

/** Сам человек — все его вкладки одной записью; ещё не подключился — null. */
export function presenceSelf(people: PresencePerson[], self: PresenceSelf): PresencePerson | null {
  return groupByPerson(people.filter(person => isSelf(person, self)))[0] ?? null
}

/** Сколько человек в сервисе, включая себя: по людям, а не по вкладкам. */
export function presenceOnline(people: PresencePerson[], self: PresenceSelf): number {
  const keys = new Set(people.filter(person => !isSelf(person, self)).map(personKey))
  return keys.size + (self.email || self.name ? 1 : 0)
}

/** Буква в кружке — первая буква имени; полное имя — в подсказке при наведении и в списке. */
export function presenceInitials(name: string): string {
  return ([...name.trim()][0] ?? '').toUpperCase()
}

/** Сколько человек в сервисе: «меньше минуты», «12 мин», «1 ч 5 мин» — без рода («зашёл» / «зашла»). */
export function presenceDuration(since: number, now: number): string {
  if (!since) return ''
  const minutes = Math.max(0, Math.floor((now - since) / 60000))
  if (minutes < 1) return 'меньше минуты'
  if (minutes < 60) return `${minutes} мин`
  const hours = Math.floor(minutes / 60)
  return minutes % 60 ? `${hours} ч ${minutes % 60} мин` : `${hours} ч`
}

export const PRESENCE_DEVICE: Record<PresenceDevice, { label: string, icon: string }> = {
  desktop: { label: 'компьютер', icon: 'i-lucide-monitor' },
  tablet: { label: 'планшет', icon: 'i-lucide-tablet' },
  phone: { label: 'телефон', icon: 'i-lucide-smartphone' }
}

/** Устройство по экрану: касание и короткая сторона меньше 600 — телефон, касание крупнее — планшет. */
export function presenceDevice(coarse: boolean, width: number, height: number): PresenceDevice {
  if (!coarse) return 'desktop'
  return Math.min(width, height) < 600 ? 'phone' : 'tablet'
}

/** Кто что правит: ключ → язык → имена (без себя; человек с двумя вкладками на одной ячейке — один раз). */
export function presenceEditors(people: PresencePerson[], self: PresenceSelf): Record<string, Record<string, string[]>> {
  const map: Record<string, Record<string, string[]>> = {}
  const counted = new Set<string>()
  for (const person of people) {
    if (!person.editing || isSelf(person, self)) continue
    const mark = [person.editing.key, person.editing.lang, personKey(person)].join('|')
    if (counted.has(mark)) continue
    counted.add(mark)
    const langs = (map[person.editing.key] ??= {})
    const names = (langs[person.editing.lang] ??= [])
    names.push(person.name)
  }
  return map
}

/** Метка на ячейке: «Антон правит DE», двое и больше — «Антон +1 правят DE». */
export function presenceLabel(names: string[], lang: string): string {
  const who = names.length > 1 ? `${names[0]} +${names.length - 1}` : names[0]
  return `${who} ${names.length > 1 ? 'правят' : 'правит'} ${lang.toUpperCase()}`
}
