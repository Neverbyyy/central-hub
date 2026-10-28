// Выгрузка в Figma: выборка разделов (например, Cars 2 вместе с общими) — файл на каждый язык
// для встроенного импорта переменных Figma, каждый файл становится режимом.
// Без Nuxt-глобалов: общий для маршрута и тестов базы.

import type { SupabaseClient } from '@supabase/supabase-js'
import { figmaModeFiles, type FigmaSourceRow } from '@amaya/l10n-core'
import { HubError } from './errors'
import { allKeys } from './keys'

export async function figmaExport(db: SupabaseClient, { prefixes, languages }: { prefixes: string[], languages?: string[] }) {
  // Раздел — начало ключа с точкой: common. не должен захватить common_x.
  const sections = [...new Set(prefixes.map(p => p.trim()).filter(Boolean).map(p => (p.endsWith('.') ? p : `${p}.`)))]
  if (!sections.length) throw new HubError('Выберите хотя бы один раздел')
  if (sections.length > 50) throw new HubError('Не больше 50 разделов за раз')

  const { data, error } = await db.from('languages').select('code').eq('in_editor', true).order('position')
  if (error) throw error
  const editorLanguages = (data as { code: string }[]).map(l => l.code)
  const unknown = (languages ?? []).filter(lang => !editorLanguages.includes(lang))
  if (unknown.length) throw new HubError(`Неизвестные языки: ${unknown.join(', ')}`)
  // Порядок режимов — как в гриде
  const modes = languages?.length ? editorLanguages.filter(lang => languages.includes(lang)) : editorLanguages

  // Раздел внутри уже выбранного (app. и app.cars2.) ничего не добавит — читаем только внешние
  const roots = sections.filter(s => !sections.some(other => other !== s && s.startsWith(other)))
  const rows = new Map<string, FigmaSourceRow>()
  for (const prefix of roots) {
    for (const row of await allKeys<FigmaSourceRow>(db, 'technical_key, translations, description', prefix)) rows.set(row.technical_key, row)
  }

  try {
    return { keys: rows.size, languages: modes, files: figmaModeFiles([...rows.values()], { languages: modes }) }
  } catch (error) {
    throw new HubError((error as Error).message)
  }
}
