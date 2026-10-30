import { keyInExportSet, type ExportSetPrefixes } from '@amaya/l10n-core'

export interface ExportRule extends ExportSetPrefixes {
  name: string
  path_template: string
}

// Наборы выгрузки по-человечески: inapp → InApp
export const EXPORT_PROJECTS: Record<string, string> = { inapp: 'InApp', pages_hub: 'Pages Hub' }
export const exportProjectName = (name: string) => EXPORT_PROJECTS[name] ?? name

/**
 * В какой проект попадёт ключ: app. — только InApp, web. — только Pages Hub, common. — в оба.
 * Правило то же, что у выгрузки (keyInExportSet). Наборы грузятся один раз и общие для всех мест.
 */
export function useExportRules() {
  const { data: rules } = useFetch<ExportRule[]>('/api/export/rules', { key: 'export-rules', server: false, lazy: true, default: () => [] })

  // «InApp», «InApp и Pages Hub»; пустая строка — ни в один проект
  const targetNames = (key: string) => rules.value
    .filter(rule => keyInExportSet(rule, key))
    .map(rule => exportProjectName(rule.name))
    .join(' и ')

  return { rules, targetNames }
}
