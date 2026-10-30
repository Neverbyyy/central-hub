// История ключа в панели: из записей «поле — было — стало» — заголовки и сводки карточек по-человечески

import { plural } from './plural'

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

const FIELD_LABEL: Record<string, string> = {
  created: 'Создан',
  translation: 'Текст',
  status: 'Статус',
  description: 'Описание',
  max_length: 'Лимит',
  tags: 'Теги',
  figma_url: 'Figma'
}

const SOURCE_LABEL: Record<string, string> = {
  ui: 'интерфейс',
  mcp: 'ИИ через MCP',
  import: 'импорт',
  sql: 'база',
  test: 'автотест'
}

const STATUS_WORD: Record<string, string> = { approved: 'утверждён', draft: 'черновик', ai: 'от ИИ' }

/** Откуда правка: интерфейс, ИИ через MCP, импорт… */
export const historySourceLabel = (source: string) => SOURCE_LABEL[source] ?? source

/** Заголовок записи; создание и пометка «устаревший» — события без «было → стало». */
export const entryTitle = (entry: HistoryEntry) => entry.field === 'deprecated'
  ? (entry.new_value ? 'Помечен устаревшим' : 'Возвращён из устаревших')
  : (FIELD_LABEL[entry.field] ?? entry.field)

export const entryHasDiff = (entry: HistoryEntry) => entry.field !== 'created' && entry.field !== 'deprecated'

/** Значение для «было → стало»: пустое — «—», статус — словом. */
export const entryValueText = (entry: HistoryEntry, value: string | null) => {
  if (value === null || value === '') return '—'
  return entry.field === 'status' ? (STATUS_WORD[value] ?? value) : value
}

/** Языки действия коротко: EN, RU, DE +6 */
export const entryLangs = (entries: HistoryEntry[]) => {
  const langs = [...new Set(entries.map(e => e.lang).filter((l): l is string => !!l))].map(l => l.toUpperCase())
  return langs.length > 3 ? `${langs.slice(0, 3).join(', ')} +${langs.length - 3}` : langs.join(', ')
}

export const isCreationAction = (action: HistoryAction) => action.entries.some(e => e.field === 'created')

/** Подробности действия; у создания сама запись «Создан» — уже заголовок карточки. */
export const actionDetailEntries = (action: HistoryAction) => action.entries.filter(e => e.field !== 'created')

export const actionDetailsLabel = (action: HistoryAction) => {
  const n = actionDetailEntries(action).length
  return isCreationAction(action) ? `Тексты (${n})` : `Подробности (${n})`
}

/** Сводка действия из нескольких записей; подробности — по клику. */
export const actionSummary = (action: HistoryAction) => {
  const { entries } = action
  // Создание ключа вместе с первыми текстами — просто «Создан», тексты под кнопкой
  if (isCreationAction(action)) return 'Создан'
  if (entries.every(e => e.field === 'status' && e.new_value === 'approved')) return `Утверждено: ${entryLangs(entries)}`
  if (entries.every(e => e.field === 'translation')) {
    const texts = entries.length
    return action.source === 'import'
      ? `Импорт: тексты на ${texts} ${plural(texts, ['языке', 'языках', 'языках'])}`
      : `Тексты: ${entryLangs(entries)}`
  }
  const fields = [...new Set(entries.map(e => entryTitle(e)))]
  return `${entries.length} ${plural(entries.length, ['изменение', 'изменения', 'изменений'])}: ${fields.join(', ').toLowerCase()}`
}
