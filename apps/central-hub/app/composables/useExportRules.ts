import { keyInExportSet, type ExportSetPrefixes } from '@amaya/l10n-core'

export interface ExportRule extends ExportSetPrefixes {
  name: string
  path_template: string
}

// Наборы выгрузки по-человечески: inapp → InApp; ds — дизайн-система и экраны в этом же монорепо
export const EXPORT_PROJECTS: Record<string, string> = { inapp: 'InApp', pages_hub: 'Pages Hub', ds: 'Дизайн-система' }
export const exportProjectName = (name: string) => EXPORT_PROJECTS[name] ?? name

const projectList = new Intl.ListFormat('ru', { type: 'conjunction' })

/**
 * В какой проект попадёт ключ: app. — InApp, web. — Pages Hub, common. — во все; app.cars2. и web.lp_cars2. — ещё
 * и в дизайн-систему. Правило то же, что у выгрузки (keyInExportSet). Наборы грузятся один раз и общие для всех мест.
 */
export function useExportRules() {
  const { data: rules } = useFetch<ExportRule[]>('/api/export/rules', { key: 'export-rules', server: false, lazy: true, default: () => [] })

  // «InApp», «InApp и Pages Hub», «InApp, Pages Hub и Дизайн-система»; пустая строка — ни в один проект
  const targetNames = (key: string) => projectList.format(rules.value
    .filter(rule => keyInExportSet(rule, key))
    .map(rule => exportProjectName(rule.name)))

  return { rules, targetNames }
}
