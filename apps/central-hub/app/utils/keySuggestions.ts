// Подсказки к полю «Ключ» в форме «Новый ключ»: что может идти следующей частью — из «Как называть ключи»,
// справочника и разделов, которые уже есть. Чистые функции: форма держит только фокус, курсор и клавиатуру.
import { registryKindOf, type NEW_KEY_ROOTS, type RegistryKind } from '@amaya/l10n-core'
import { keysCount } from './plural'

/** Раздел из дерева ключей (/api/keys/tree). */
export interface KeyTreeNode {
  path: string
  label: string
  keys: number
  children: KeyTreeNode[]
}

/** Разделы по полному пути: app.cars2 → узел. */
export type KeyTreeIndex = Map<string, KeyTreeNode>

export const indexKeyTree = (roots: KeyTreeNode[]): KeyTreeIndex => {
  const index: KeyTreeIndex = new Map()
  const walk = (list: KeyTreeNode[]) => list.forEach((node) => {
    index.set(node.path, node)
    walk(node.children)
  })
  walk(roots)
  return index
}

// Первая часть ключа — из «Как называть ключи»; порядок — от самого частого
const ROOT_HINTS = {
  app: 'Игра: пейволлы, онбординги, баннеры',
  web: 'Сайт или лендинг',
  common: 'Общее для всех: кнопки, ссылки, цены, фразы',
  brand: 'Отличается по юрлицу',
  ds: 'Строки компонентов дизайн-системы',
  test: 'Только для A/B-теста: test.<тест>.'
} satisfies Record<typeof NEW_KEY_ROOTS[number], string>

// Типичные разделы — пока в игре или на сайте своих ещё нет
const TYPICAL: Record<string, Record<string, string>> = {
  common: { button: 'кнопки', link: 'ссылки', price: 'цены', period: 'периоды', legal: 'юридические фразы' },
  app: { paywall: 'пейволл', onboarding: 'онбординг', banner: 'баннер' },
  web: { home: 'главная страница', faq: 'вопросы и ответы' },
  brand: { legal: 'юридические фразы' }
}

const KIND_ADD: Record<RegistryKind, string> = { game: 'игру', site: 'сайт', brand: 'бренд', test: 'тест', project: 'проект' }

/** «добавить игру в справочник» — винительный падеж вида кода. */
export const addCodeLabel = (kind: RegistryKind) => `добавить ${KIND_ADD[kind]} в справочник`

/** Справочник второй части нового ключа: app → игры, web → сайты. legacy.* новым ключам нельзя — для него никакого. */
export const newKeyRegistryKind = (root: string) => (root === 'legacy' ? undefined : registryKindOf(root))

export interface RegistryCode {
  kind: RegistryKind
  code: string
  title: string
}

export interface KeySuggestion {
  // Ключ целиком после выбора: app.cars2.
  value: string
  segment: string
  hint: string
  // В какой проект уйдёт ключ — только у начал
  targets?: string
  // Кода нет в справочнике — пункт «добавить»
  add?: RegistryKind
}

interface Part { segment: string, hint: string, targets?: string }

interface SuggestContext {
  registry: readonly RegistryCode[]
  tree: KeyTreeIndex
  // «InApp», «InApp и Pages Hub» — useExportRules
  targetNames: (key: string) => string
}

// Сколько ключей уже в разделе: «12 ключей» в подсказке
const sectionKeys = (tree: KeyTreeIndex, path: string) => {
  const count = tree.get(path)?.keys
  return count ? keysCount(count) : ''
}

// Что может идти после готовых частей. closed — выбор из известного списка (начала, справочник)
function partsAfter(done: string[], { registry, tree, targetNames }: SuggestContext): { parts: Part[], kind?: RegistryKind, closed: boolean } {
  const path = done.join('.')
  // test.<тест>. — дальше обычный ключ: подсказки те же, что с начала
  const inner = done[0] === 'test' && done.length >= 2 ? done.slice(2) : done
  if (!inner.length) {
    const roots = Object.entries(ROOT_HINTS).filter(([root]) => !(done[0] === 'test' && root === 'test'))
    // У начала сразу видно, в какой проект уйдёт ключ: app. — InApp, web. — Pages Hub
    return { parts: roots.map(([segment, hint]) => ({ segment, hint, targets: targetNames(`${path ? `${path}.` : ''}${segment}.`) })), closed: true }
  }
  const root = inner[0]!
  const kind = inner.length === 1 ? newKeyRegistryKind(root) : undefined
  if (kind) {
    const parts = registry
      .filter(entry => entry.kind === kind)
      .map(entry => ({ segment: entry.code, hint: [entry.title, sectionKeys(tree, `${path}.${entry.code}`)].filter(Boolean).join(' · ') }))
    return { parts, kind, closed: true }
  }
  const typical = inner.length === (newKeyRegistryKind(root) ? 2 : 1) ? TYPICAL[root] ?? {} : {}
  const existing = tree.get(path)?.children ?? []
  const parts = existing.map(node => ({ segment: node.label, hint: [typical[node.label], sectionKeys(tree, node.path)].filter(Boolean).join(' · ') }))
  for (const [segment, hint] of Object.entries(typical)) {
    if (!parts.some(part => part.segment === segment)) parts.push({ segment, hint })
  }
  return { parts, closed: false }
}

/** Подсказки к последней, недописанной части ключа value. */
export function keySuggestions(value: string, context: SuggestContext): KeySuggestion[] {
  const done = value.split('.')
  const partial = done.pop()!
  if (done.some(part => !part)) return []
  const { parts, kind, closed } = partsAfter(done, context)
  const base = done.length ? `${done.join('.')}.` : ''
  // Ищем и по началу части, и по пояснению: «игра» найдёт app., «cars» — Cars 2. По пояснению — от двух букв,
  // иначе «a» нашло бы и test. («A/B-теста»)
  const matches = parts.filter(part => part.segment.startsWith(partial) || (partial.length >= 2 && part.hint.toLowerCase().includes(partial)))
  // Из известного списка ничего не подошло — показываем весь: видно, что можно
  const shown = matches.length || !closed ? matches : parts
  const list: KeySuggestion[] = shown.map(part => ({ value: `${base}${part.segment}.`, segment: part.segment, hint: part.hint, targets: part.targets }))
  // Кода нет в справочнике — предлагаем добавить: после совпадений, а если их нет — первым
  if (kind && /^[a-z0-9_]{2,}$/.test(partial) && !parts.some(part => part.segment === partial)) {
    const add = { value: `${base}${partial}.`, segment: partial, hint: addCodeLabel(kind), add: kind }
    if (matches.length) list.push(add)
    else list.unshift(add)
  }
  return list
}

/** Расстояние Левенштейна — сколько букв поправить, чтобы из одного кода получить другой. */
export function editDistance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const row = [i]
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j]! + 1, row[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    prev = row
  }
  return prev[b.length]!
}

/** Коды справочника, похожие на набранный: опечатка или недописанный код (car → cars2). */
export function findSimilarCodes(missing: { kind: RegistryKind, code: string }, registry: readonly RegistryCode[]): RegistryCode[] {
  // У коротких кодов допуск в одну букву, иначе car похож на farm
  const tolerance = (code: string) => Math.min(code.length, missing.code.length) >= 5 ? 2 : 1
  return registry.filter(entry => entry.kind === missing.kind && (
    entry.code.startsWith(missing.code) || missing.code.startsWith(entry.code) || editDistance(entry.code, missing.code) <= tolerance(entry.code)
  ))
}
