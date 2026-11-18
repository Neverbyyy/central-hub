// Подсказки к полю «Ключ» в форме «Новый ключ»: что может идти следующей частью — из «Как называть ключи»,
// справочника и разделов, которые уже есть. Чистые функции: форма держит только фокус, курсор и клавиатуру.
import { registryKindOf, type NEW_KEY_ROOTS, type RegistryKind } from '@amaya/l10n-core'
import type { Translate } from '../../shared/utils/plural'

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

// Первая часть ключа — из «Как называть ключи»; порядок — от самого частого. Пояснения — в словаре: keyHints.roots.<начало>
const ROOTS = ['app', 'web', 'common', 'brand', 'ds', 'test'] as const satisfies readonly (typeof NEW_KEY_ROOTS[number])[]

// Типичные разделы — пока в игре или на сайте своих ещё нет. Пояснения — keyHints.typical.<начало>.<раздел>
const TYPICAL: Record<string, readonly string[]> = {
  common: ['button', 'link', 'price', 'period', 'legal'],
  app: ['paywall', 'onboarding', 'banner'],
  web: ['home', 'faq'],
  brand: ['legal']
}

/** «добавить игру в справочник» — на языке интерфейса. */
export const addCodeLabel = (kind: RegistryKind, t: Translate) => t(`keyHints.add.${kind}`)

/** «как новую игру» — код, которого ещё нет в справочнике. */
export const newCodeLabel = (kind: RegistryKind, t: Translate) => t(`keyHints.asNew.${kind}`)

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
  // Словарь интерфейса: пояснения и счётчики — на его языке
  t: Translate
}

// Сколько ключей уже в разделе: «12 ключей» в подсказке
const sectionKeys = (tree: KeyTreeIndex, path: string, t: Translate) => {
  const count = tree.get(path)?.keys
  return count ? t('common.keys', { count }, count) : ''
}

// Что может идти после готовых частей. closed — выбор из известного списка (начала, справочник)
function partsAfter(done: string[], { registry, tree, targetNames, t }: SuggestContext): { parts: Part[], kind?: RegistryKind, closed: boolean } {
  const path = done.join('.')
  // test.<тест>. — дальше обычный ключ: подсказки те же, что с начала
  const inner = done[0] === 'test' && done.length >= 2 ? done.slice(2) : done
  if (!inner.length) {
    const roots = ROOTS.filter(root => !(done[0] === 'test' && root === 'test'))
    // У начала сразу видно, в какой проект уйдёт ключ: app. — InApp, web. — Pages Hub
    return { parts: roots.map(segment => ({ segment, hint: t(`keyHints.roots.${segment}`), targets: targetNames(`${path ? `${path}.` : ''}${segment}.`) })), closed: true }
  }
  const root = inner[0]!
  const kind = inner.length === 1 ? newKeyRegistryKind(root) : undefined
  if (kind) {
    const parts = registry
      .filter(entry => entry.kind === kind)
      .map(entry => ({ segment: entry.code, hint: [entry.title, sectionKeys(tree, `${path}.${entry.code}`, t)].filter(Boolean).join(' · ') }))
    return { parts, kind, closed: true }
  }
  const typical = inner.length === (newKeyRegistryKind(root) ? 2 : 1) ? TYPICAL[root] ?? [] : []
  const typicalHint = (segment: string) => (typical.includes(segment) ? t(`keyHints.typical.${root}.${segment}`) : '')
  const existing = tree.get(path)?.children ?? []
  const parts = existing.map(node => ({ segment: node.label, hint: [typicalHint(node.label), sectionKeys(tree, node.path, t)].filter(Boolean).join(' · ') }))
  for (const segment of typical) {
    if (!parts.some(part => part.segment === segment)) parts.push({ segment, hint: typicalHint(segment) })
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
    const add = { value: `${base}${partial}.`, segment: partial, hint: addCodeLabel(kind, context.t), add: kind }
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
