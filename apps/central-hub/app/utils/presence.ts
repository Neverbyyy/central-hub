// Присутствие коллег: кто сейчас в сервисе и что правит. Чистые функции — состояние в composables/usePresence.ts

export interface PresenceCell {
  key: string
  lang: string
}

export type PresenceDevice = 'desktop' | 'tablet' | 'phone'

export interface PresenceMeta {
  name: string
  // Где человек: название страницы
  page: string
  // Какую ячейку правит (ключ и язык) или null
  editing: PresenceCell | null
  // Когда открыл вкладку, мс
  since: number
  device: PresenceDevice
}

export interface PresencePerson extends PresenceMeta {
  // Вкладка: у одного человека их бывает несколько
  tab: string
}

// Человек в шапке: его вкладки сложены в одну запись
export interface PresenceGroup extends PresencePerson {
  tabs: number
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
      page: typeof last.page === 'string' ? last.page : '',
      editing: isCell(last.editing) ? { key: last.editing.key, lang: last.editing.lang } : null,
      since: typeof last.since === 'number' && Number.isFinite(last.since) ? last.since : 0,
      device: DEVICES.includes(last.device as PresenceDevice) ? last.device as PresenceDevice : 'desktop'
    }]
  })
}

/**
 * Люди по именам: вкладки одного человека — одна запись. Показана вкладка, где он что-то правит (иначе — последняя
 * открытая), «в сервисе с» — от самой ранней вкладки. Порядок — по алфавиту.
 */
function groupByName(people: PresencePerson[]): PresenceGroup[] {
  const byName = new Map<string, PresenceGroup>()
  for (const person of people) {
    const seen = byName.get(person.name)
    if (!seen) {
      byName.set(person.name, { ...person, tabs: 1 })
      continue
    }
    const shown = (!seen.editing && person.editing) || (!seen.editing === !person.editing && person.since > seen.since) ? person : seen
    const earliest = [seen.since, person.since].filter(Boolean)
    byName.set(person.name, { ...shown, since: earliest.length ? Math.min(...earliest) : 0, tabs: seen.tabs + 1 })
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name, 'ru'))
}

/** Другие люди — без своих вкладок и тёзок: одно имя — один человек. */
export function presenceOthers(people: PresencePerson[], self: { tab: string, name: string | null }): PresenceGroup[] {
  return groupByName(people.filter(person => person.tab !== self.tab && person.name !== self.name))
}

/** Сам человек — все его вкладки одной записью; ещё не подключился — null. */
export function presenceSelf(people: PresencePerson[], self: { tab: string, name: string | null }): PresenceGroup | null {
  return groupByName(people.filter(person => person.tab === self.tab || (!!self.name && person.name === self.name)))[0] ?? null
}

/** Сколько человек в сервисе, включая себя: по именам, а не по вкладкам. */
export function presenceOnline(people: PresencePerson[], self: { name: string | null }): number {
  const names = new Set(people.map(person => person.name))
  if (self.name) names.add(self.name)
  return names.size
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
