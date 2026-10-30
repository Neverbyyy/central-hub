import { describe, expect, it } from 'vitest'
import {
  actionDetailEntries,
  actionDetailsLabel,
  actionSummary,
  entryHasDiff,
  entryLangs,
  entryTitle,
  entryValueText,
  historySourceLabel,
  type HistoryAction,
  type HistoryEntry
} from '../../apps/central-hub/app/utils/history'

const entry = (field: string, lang: string | null = null, old_value: string | null = null, new_value: string | null = null): HistoryEntry =>
  ({ field, lang, old_value, new_value })

const action = (entries: HistoryEntry[], source = 'ui'): HistoryAction =>
  ({ id: 1, created_at: '2026-10-30T11:00:00Z', actor: 'Артём', source, entries })

const texts = (langs: string[]) => langs.map(lang => entry('translation', lang, null, 'x'))

describe('история ключа', () => {
  it('сводка: создание — просто «Создан», тексты под кнопкой', () => {
    const created = action([entry('created'), ...texts(['en', 'ru'])])
    expect(actionSummary(created)).toBe('Создан')
    expect(actionDetailsLabel(created)).toBe('Тексты (2)')
    expect(actionDetailEntries(created)).toHaveLength(2)
  })

  it('сводка: утверждение и тексты — с языками, больше трёх — «+N»', () => {
    const approved = action(['en', 'ru'].map(lang => entry('status', lang, 'draft', 'approved')))
    expect(actionSummary(approved)).toBe('Утверждено: EN, RU')
    expect(actionSummary(action(texts(['en', 'ru', 'de', 'es', 'it'])))).toBe('Тексты: EN, RU, DE +2')
    expect(actionSummary(action(texts(['en', 'ru', 'de', 'es', 'it', 'pt', 'fr', 'sv', 'nl']), 'import'))).toBe('Импорт: тексты на 9 языках')
  })

  it('сводка: разные поля — числом и списком', () => {
    const mixed = action([entry('description', null, 'a', 'b'), entry('tags', null, '', 'x'), entry('translation', 'en', 'a', 'b')])
    expect(actionSummary(mixed)).toBe('3 изменения: описание, теги, текст')
    expect(actionDetailsLabel(mixed)).toBe('Подробности (3)')
  })

  it('записи: заголовки, «было → стало», источник', () => {
    expect(entryTitle(entry('deprecated', null, null, '2026-10-30'))).toBe('Помечен устаревшим')
    expect(entryTitle(entry('deprecated'))).toBe('Возвращён из устаревших')
    expect(entryHasDiff(entry('deprecated'))).toBe(false)
    expect(entryHasDiff(entry('translation'))).toBe(true)
    expect(entryValueText(entry('status'), 'ai')).toBe('от ИИ')
    expect(entryValueText(entry('translation'), '')).toBe('—')
    expect(entryLangs([entry('translation', 'en'), entry('status', 'en')])).toBe('EN')
    expect(historySourceLabel('mcp')).toBe('ИИ через MCP')
    expect(historySourceLabel('cli')).toBe('cli')
  })
})
