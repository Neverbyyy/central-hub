import { keyInExportSet, type ExportSetPrefixes } from '@amaya/l10n-core'
import { DEFAULT_HUB_LOCALE, joinList, type HubLocale } from './hubLocale'

// Наборы выгрузки по-человечески: inapp → InApp; ds — дизайн-система и экраны в этом же монорепо.
// Общие для окна «Выгрузка в код» и сервера: сервер называет набор в тексте ошибки. InApp и Pages Hub — имена,
// не переводятся; дизайн-систему — на языке интерфейса
const EXPORT_PROJECTS: Record<string, string> = { inapp: 'InApp', pages_hub: 'Pages Hub' }
const DESIGN_SYSTEM: Record<HubLocale, string> = { ru: 'Дизайн-система', en: 'Design system', uz: 'Dizayn tizimi' }
export const exportProjectName = (name: string, locale: HubLocale = DEFAULT_HUB_LOCALE) =>
  name === 'ds' ? DESIGN_SYSTEM[locale] : EXPORT_PROJECTS[name] ?? name

/** «InApp», «InApp и Pages Hub» / «InApp and Pages Hub» — наборы одной строкой; пустая строка — ни одного. */
export const exportProjectList = (names: string[], locale: HubLocale = DEFAULT_HUB_LOCALE) =>
  joinList(names.map(name => exportProjectName(name, locale)), locale)

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

/**
 * Почему сервер не выгружает набор (ошибка 409): «Сначала — «Дизайн-система»: общие ключи (3) ещё не в её основной
 * ветке…». block — что держит; 'not-connected' — проверка не подключена к GitHub (NUXT_EXPORT_REPOS). Окно пишет то же
 * своими словами из словаря. Число — в скобках, без форм множественного: на язык интерфейса текст переводит каталог
 * ошибок сервера по русскому шаблону (server/utils/errorMessages.ts)
 */
export function reviewGateMessage(reviewSet: string, block: ReviewBlock | 'not-connected') {
  const review = `«${exportProjectName(reviewSet)}»`
  if (block === 'not-connected') return `Сначала — ${review}, но она не подключена к GitHub (NUXT_EXPORT_REPOS). Срочно — выгрузите без проверки`
  const what = block.keys.length ? `общие ключи (${block.keys.length}${block.truncated ? '+' : ''})` : 'много изменений'
  return `Сначала — ${review}: ${what} ещё не в её основной ветке. Смержите её PR или выгрузите без проверки`
}
