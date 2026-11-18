import { keyInExportSet, type ExportSetPrefixes } from '@amaya/l10n-core'

export interface ExportRule extends ExportSetPrefixes {
  name: string
  path_template: string
}

// Названия наборов на языке интерфейса — projectList (app/utils/projectName.ts)

/**
 * В какой проект попадёт ключ: app. — InApp, web. — Pages Hub, common. — во все; app.cars2. и web.lp_cars2. — ещё
 * и в дизайн-систему. Правило то же, что у выгрузки (keyInExportSet). Наборы грузятся один раз и общие для всех мест.
 */
export function useExportRules() {
  const { data: rules } = useFetch<ExportRule[]>('/api/export/rules', { key: 'export-rules', server: false, lazy: true, default: () => [] })

  // «InApp», «InApp и Pages Hub», «InApp, Pages Hub и Дизайн-система»; пустая строка — ни в один проект
  const targetNames = (key: string) => projectList(rules.value.filter(rule => keyInExportSet(rule, key)).map(rule => rule.name))

  return { rules, targetNames }
}
