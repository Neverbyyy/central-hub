import { keyInExportSet, type ExportSetPrefixes } from '@amaya/l10n-core'
import { plural } from './plural'

// Наборы выгрузки по-человечески: inapp → InApp; ds — дизайн-система и экраны в этом же монорепо.
// Общие для окна «Выгрузка в код» и сервера: сервер называет набор в тексте ошибки
export const EXPORT_PROJECTS: Record<string, string> = { inapp: 'InApp', pages_hub: 'Pages Hub', ds: 'Дизайн-система' }
export const exportProjectName = (name: string) => EXPORT_PROJECTS[name] ?? name

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
  let truncated = false
  for (const file of review.changes) {
    if (file.truncated) truncated = true
    for (const line of file.lines) {
      if (keyInExportSet(target, line.key)) keys.add(line.key)
    }
  }
  return keys.size || truncated ? { keys: [...keys].sort(), truncated } : null
}

/** «3 общих ключа», «3+ общих ключа» (не все строки пришли), «много изменений» — для окна и для ошибки сервера. */
export const reviewBlockText = (block: ReviewBlock) => {
  if (!block.keys.length) return 'много изменений'
  const n = block.keys.length
  return `${n}${block.truncated ? '+' : ''} ${plural(n, ['общий ключ', 'общих ключа', 'общих ключей'])}`
}
