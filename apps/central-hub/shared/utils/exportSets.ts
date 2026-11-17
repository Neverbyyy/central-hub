import { keyInExportSet, type ExportSetPrefixes } from '@amaya/l10n-core'
import { plural } from './plural'

// Наборы выгрузки по-человечески: inapp → InApp; ds — дизайн-система и экраны в этом же монорепо.
// Общие для окна «Выгрузка в код» и сервера: сервер называет набор в тексте ошибки
const EXPORT_PROJECTS: Record<string, string> = { inapp: 'InApp', pages_hub: 'Pages Hub', ds: 'Дизайн-система' }
export const exportProjectName = (name: string) => EXPORT_PROJECTS[name] ?? name

const projectList = new Intl.ListFormat('ru', { type: 'conjunction' })
/** «InApp», «InApp и Pages Hub» — наборы по-человечески одной строкой; пустая строка — ни одного. */
export const exportProjectList = (names: string[]) => projectList.format(names.map(exportProjectName))

/**
 * Предпросмотр набора проверки (review_set, дизайн-система): что ещё не в его основной ветке. Структурно — и серверный
 * результат syncExportToGithub, и то, что окно получило от /api/export/<набор>/preview.
 */
export interface ReviewPreview {
  outcome: string
  changes: { lines: { key: string }[], truncated?: boolean }[]
}

export interface ReviewBlock {
  // Общие с проектом ключи, которых в основной ветке проверки ещё нет в нынешнем виде
  keys: string[]
  // Изменений так много, что сервер отдал не все строки: общие среди них могут быть — держим
  truncated: boolean
}

/**
 * Можно ли выгружать набор, у которого есть набор проверки: сначала тексты проверяют и мержат в дизайн-системе, потом —
 * в рабочий проект. Держат только общие ключи (keyInExportSet проекта); ключи, которых в проверке нет (legacy.*), — нет.
 * Открытый, но не смерженный PR проверки — тоже изменения: предпросмотр сравнивает с основной веткой.
 * null — можно выгружать.
 */
export function reviewGate(target: ExportSetPrefixes, review: ReviewPreview): ReviewBlock | null {
  if (review.outcome !== 'ready') return null
  const keys = new Set<string>()
  // Ключ повторяется в файле каждого языка — правило набора проверяем один раз на ключ
  const seen = new Set<string>()
  let truncated = false
  for (const file of review.changes) {
    if (file.truncated) truncated = true
    for (const { key } of file.lines) {
      if (seen.has(key)) continue
      seen.add(key)
      if (keyInExportSet(target, key)) keys.add(key)
    }
  }
  return keys.size || truncated ? { keys: [...keys].sort(), truncated } : null
}

// «3 общих ключа», «3+ общих ключа» (не все строки пришли), «много изменений» (ни одного видимого)
function blockSize(block: ReviewBlock) {
  if (!block.keys.length) return 'много изменений'
  const n = block.keys.length
  return `${n}${block.truncated ? '+' : ''} ${plural(n, ['общий ключ', 'общих ключа', 'общих ключей'])}`
}

/**
 * Почему набор ждёт проверку — одной фразой для окна и для ошибки сервера: «Сначала — «Дизайн-система»: 3 общих ключа
 * ещё не в её основной ветке». block — что держит; 'not-connected' — проверка не подключена к GitHub (NUXT_EXPORT_REPOS);
 * 'failed' — её предпросмотр не загрузился.
 */
export function reviewGateMessage(reviewSet: string, block: ReviewBlock | 'not-connected' | 'failed') {
  const review = `«${exportProjectName(reviewSet)}»`
  if (block === 'not-connected') return `Сначала — ${review}, но она не подключена к GitHub`
  if (block === 'failed') return `Сначала — ${review}, но сравнить её с репозиторием не получилось`
  return `Сначала — ${review}: ${blockSize(block)} ещё не в её основной ветке`
}
