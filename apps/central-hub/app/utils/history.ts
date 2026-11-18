// История ключа в панели: из записей «поле — было — стало» — заголовки и сводки карточек по-человечески.
// Тексты — из словаря интерфейса (раздел history): функции принимают t — тот же, что $t в шаблоне

import type { Translate } from '../../shared/utils/plural'

export interface HistoryEntry {
  lang: string | null
  field: string
  old_value: string | null
  new_value: string | null
}

// Одно действие — одна правка: импорт 9 языков или «Утвердить всё» приходят одной записью
export interface HistoryAction {
  id: number
  created_at: string
  actor: string | null
  source: string
  entries: HistoryEntry[]
}

export interface HistoryPage {
  total: number
  actions: HistoryAction[]
}

// Подписи, которые есть в словаре; остальные поля, источники и статусы показываются как есть
const FIELDS = new Set(['created', 'translation', 'status', 'description', 'max_length', 'tags', 'figma_url'])
const SOURCES = new Set(['ui', 'mcp', 'import', 'sql', 'test'])
const STATUSES = new Set(['approved', 'draft', 'ai'])

/** Откуда правка: интерфейс, ИИ через MCP, импорт… */
export const historySourceLabel = (source: string, t: Translate) => (SOURCES.has(source) ? t(`history.sources.${source}`) : source)

/** Заголовок записи; создание и пометка «устаревший» — события без «было → стало». */
export const entryTitle = (entry: HistoryEntry, t: Translate) => entry.field === 'deprecated'
  ? t(entry.new_value ? 'history.deprecated' : 'history.restored')
  : (FIELDS.has(entry.field) ? t(`history.fields.${entry.field}`) : entry.field)

export const entryHasDiff = (entry: HistoryEntry) => entry.field !== 'created' && entry.field !== 'deprecated'

/** Значение для «было → стало»: пустое — «—», статус — словом. */
export const entryValueText = (entry: HistoryEntry, value: string | null, t: Translate) => {
  if (value === null || value === '') return '—'
  return entry.field === 'status' && STATUSES.has(value) ? t(`history.status.${value}`) : value
}

/** Языки действия коротко: EN, RU, DE +6 */
export const entryLangs = (entries: HistoryEntry[]) => {
  const langs = [...new Set(entries.map(e => e.lang).filter((l): l is string => !!l))].map(l => l.toUpperCase())
  return langs.length > 3 ? `${langs.slice(0, 3).join(', ')} +${langs.length - 3}` : langs.join(', ')
}

export const isCreationAction = (action: HistoryAction) => action.entries.some(e => e.field === 'created')

/** Подробности действия; у создания сама запись «Создан» — уже заголовок карточки. */
export const actionDetailEntries = (action: HistoryAction) => action.entries.filter(e => e.field !== 'created')

export const actionDetailsLabel = (action: HistoryAction, t: Translate) => {
  const count = actionDetailEntries(action).length
  return t(isCreationAction(action) ? 'history.texts' : 'history.details', { count })
}

/** Сводка действия из нескольких записей; подробности — по клику. */
export const actionSummary = (action: HistoryAction, t: Translate) => {
  const { entries } = action
  // Создание ключа вместе с первыми текстами — просто «Создан», тексты под кнопкой
  if (isCreationAction(action)) return t('history.summary.created')
  if (entries.every(e => e.field === 'status' && e.new_value === 'approved')) return t('history.summary.approved', { langs: entryLangs(entries) })
  if (entries.every(e => e.field === 'translation')) {
    return action.source === 'import'
      ? t('history.summary.importTexts', entries.length)
      : t('history.summary.texts', { langs: entryLangs(entries) })
  }
  const fields = [...new Set(entries.map(e => entryTitle(e, t)))].join(', ').toLocaleLowerCase()
  return t('history.summary.changes', { fields, count: entries.length }, entries.length)
}

// Панель ключа показывает историю порциями: сначала последние 10 действий, «Показать ещё» — по 20
export const HISTORY_FIRST = 10
export const HISTORY_MORE = 20
