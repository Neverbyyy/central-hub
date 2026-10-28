// Файлы локалей проектов: чтение и выгрузка.
// Выгрузка правит исходный файл как шаблон: меняет только изменившиеся значения, убирает
// удалённые строки и дописывает новые. Без изменений результат совпадает с шаблоном байт в байт.

import { parseCst, type CstMember, type CstObject } from './json-cst'

// nested — разделы вложенными объектами (InApp); flat — один уровень, точки внутри имени (Pages Hub)
export type LocaleFormat = 'nested' | 'flat'

export interface LocaleEntry {
  // Точный путь в файле: ['settings', 'auth.email.enterEmail']
  path: string[]
  // null бывает только в старых файлах — сохраняем как есть
  value: string | null
}

const pathId = (path: readonly string[]) => JSON.stringify(path)

/** Строки файла с семантикой JSON.parse: у дубля ключа побеждает последнее значение. */
export function readLocaleFile(text: string): LocaleEntry[] {
  const entries: LocaleEntry[] = []
  const walk = (node: unknown, path: string[]) => {
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      const next = [...path, key]
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        walk(value, next)
      } else if (typeof value === 'string' || value === null) {
        entries.push({ path: next, value })
      } else {
        throw new Error(`Значение «${next.join(' → ')}» не строка: ${JSON.stringify(value)}`)
      }
    }
  }
  walk(JSON.parse(text), [])
  return entries
}

/** Ключ сервиса для строки старого файла: префикс + путь через точку. */
export const legacyKey = (prefix: string, path: readonly string[]) => prefix + path.join('.')

/** Путь строки в файле: у старых ключей — сохранённый точный путь, у новых — по формату набора. */
export function filePath(key: string, format: LocaleFormat, legacyPath?: readonly string[] | null): string[] {
  if (legacyPath?.length) return [...legacyPath]
  return format === 'flat' ? [key] : key.split('.')
}

/**
 * Пути, которые нельзя положить в один файл: одинаковые и «строка — начало раздела»
 * (`a.b` и `a.b.c`: в JSON `b` не может быть одновременно строкой и объектом).
 */
export function findExportConflicts(paths: readonly (readonly string[])[]): string[] {
  const conflicts: string[] = []
  const leaves = new Set<string>()
  const prefixes = new Set<string>()
  for (const path of paths) {
    const id = pathId(path)
    if (leaves.has(id)) conflicts.push(`«${path.join('.')}» встречается дважды`)
    else if (prefixes.has(id)) conflicts.push(`«${path.join('.')}» — и строка, и раздел`)
    leaves.add(id)
    for (let i = 1; i < path.length; i++) prefixes.add(pathId(path.slice(0, i)))
  }
  for (const path of paths) {
    for (let i = 1; i < path.length; i++) {
      if (leaves.has(pathId(path.slice(0, i)))) {
        conflicts.push(`«${path.slice(0, i).join('.')}» — и строка, и раздел «${path.join('.')}»`)
      }
    }
  }
  return [...new Set(conflicts)]
}

export interface RenderOptions {
  // Последний импортированный файл; без него файл собирается заново
  template?: string | null
  // Желаемое содержимое файла
  entries: readonly LocaleEntry[]
  // Только для файла без шаблона
  finalNewline?: boolean
}

export function renderLocaleFile({ template, entries, finalNewline = true }: RenderOptions): string {
  const conflicts = findExportConflicts(entries.map(e => e.path))
  if (conflicts.length) throw new Error(`Конфликт путей: ${conflicts.join('; ')}`)

  if (!template) return JSON.stringify(buildTree(entries), null, 2) + (finalNewline ? '\n' : '')

  const desired = new Map(entries.map(e => [pathId(e.path), e]))
  const patched = applyChanges(template, desired)
  return insertMissing(patched, entries)
}

function buildTree(entries: readonly LocaleEntry[]) {
  const root: Record<string, unknown> = {}
  for (const { path, value } of entries) {
    let node = root
    for (const segment of path.slice(0, -1)) {
      node = (node[segment] ??= {}) as Record<string, unknown>
    }
    node[path.at(-1)!] = value
  }
  return root
}

interface Edit {
  start: number
  end: number
  text: string
}

function applyEdits(text: string, edits: Edit[]): string {
  const sorted = [...edits].sort((a, b) => b.start - a.start)
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i]!.end > sorted[i - 1]!.start) throw new Error('Пересекающиеся правки шаблона')
  }
  let result = text
  for (const edit of sorted) result = result.slice(0, edit.start) + edit.text + result.slice(edit.end)
  return result
}

const lineStart = (text: string, index: number) => text.lastIndexOf('\n', index - 1) + 1

const isBlank = (text: string) => /^[ \t]*$/.test(text)

/** Индентация строки, на которой стоит index. */
const indentAt = (text: string, index: number) => /^[ \t]*/.exec(text.slice(lineStart(text, index)))![0]

// Диапазон удаления участника: целые строки, если на них нет ничего другого
function memberRange(text: string, member: CstMember): [number, number] {
  const from = lineStart(text, member.keyStart)
  const start = isBlank(text.slice(from, member.keyStart)) ? from : member.keyStart
  const after = member.comma >= 0 ? member.comma + 1 : member.value.end
  const newline = text.indexOf('\n', after)
  const rest = newline === -1 ? text.slice(after) : text.slice(after, newline)
  const end = isBlank(rest) ? (newline === -1 ? text.length : newline + 1) : after
  return [start, end]
}

// Проход 1: замена изменившихся значений и удаление строк, которых больше нет
function applyChanges(template: string, desired: Map<string, LocaleEntry>): string {
  const root = parseCst(template)
  const edits: Edit[] = []

  const visit = (object: CstObject, path: string[]) => {
    // Последнее вхождение ключа — то, которое видит JSON.parse
    const lastIndex = new Map<string, number>()
    object.members.forEach((m, i) => lastIndex.set(m.key, i))

    const removed = new Set<number>()
    object.members.forEach((member, i) => {
      const memberPath = [...path, member.key]
      const want = desired.get(pathId(memberPath))

      if (member.value.kind === 'object') {
        // Раздел, на месте которого теперь строка, убираем — строку допишет второй проход
        if (want) removed.add(i)
        else visit(member.value, memberPath)
        return
      }
      if (!want) {
        removed.add(i)
        return
      }
      if (lastIndex.get(member.key) !== i) return
      const current = JSON.parse(template.slice(member.value.start, member.value.end))
      if (current !== want.value) {
        edits.push({ start: member.value.start, end: member.value.end, text: JSON.stringify(want.value) })
      }
    })

    if (!removed.size) return
    for (const i of removed) {
      const [start, end] = memberRange(template, object.members[i]!)
      edits.push({ start, end, text: '' })
    }
    // Если удалён хвост объекта, у последнего оставшегося участника лишняя запятая
    const kept = object.members.filter((_, i) => !removed.has(i))
    const lastKept = kept.at(-1)
    if (lastKept && lastKept !== object.members.at(-1) && lastKept.comma >= 0) {
      edits.push({ start: lastKept.comma, end: lastKept.comma + 1, text: '' })
    }
  }

  visit(root, [])
  return applyEdits(template, edits)
}

// Проход 2: дописываем строки, которых нет в файле, в конец их раздела
function insertMissing(text: string, entries: readonly LocaleEntry[]): string {
  const root = parseCst(text)

  const present = new Set<string>()
  const collect = (object: CstObject, path: string[]) => {
    for (const member of object.members) {
      const memberPath = [...path, member.key]
      if (member.value.kind === 'object') collect(member.value, memberPath)
      else present.add(pathId(memberPath))
    }
  }
  collect(root, [])

  const missing = entries.filter(e => !present.has(pathId(e.path)))
  if (!missing.length) return text

  // Для каждой строки — глубже всего существующий раздел и остаток пути внутри него
  const groups = new Map<CstObject, LocaleEntry[]>()
  for (const entry of missing) {
    let object = root
    let depth = 0
    while (depth < entry.path.length - 1) {
      const child = object.members.findLast(m => m.key === entry.path[depth])
      if (!child || child.value.kind !== 'object') break
      object = child.value
      depth++
    }
    const list = groups.get(object) ?? []
    list.push({ path: entry.path.slice(depth), value: entry.value })
    groups.set(object, list)
  }

  const edits: Edit[] = []
  for (const [object, list] of groups) {
    const objectIndent = indentAt(text, object.start)
    const last = object.members.at(-1)
    const indent = last ? indentAt(text, last.keyStart) : `${objectIndent}  `
    const tree = buildTree(list)
    const members = Object.entries(tree).map(([key, value]) =>
      `${JSON.stringify(key)}: ${JSON.stringify(value, null, 2).replaceAll('\n', `\n${indent}`)}`
    )
    const body = members.join(`,\n${indent}`)
    if (last) {
      edits.push({ start: last.value.end, end: last.value.end, text: `,\n${indent}${body}` })
    } else {
      edits.push({ start: object.start + 1, end: object.end - 1, text: `\n${indent}${body}\n${objectIndent}` })
    }
  }
  return applyEdits(text, edits)
}
