// Плагин Figma «Amaya Hub — локализация» под конкретный стенд: исходники из packages/figma-plugin/src
// с адресом сервиса и Supabase. Без Nuxt-глобалов: маршрут /api/figma/plugin.zip и unit-тест.

export const PLUGIN_FILES = ['manifest.json', 'code.js', 'ui.html'] as const

export interface PluginTarget {
  // Адрес сервиса, с которого плагин скачали: в него он и ходит
  origin: string
  // Supabase для мгновенного обновления; без адреса или ключа плагин работает опросом
  supabaseUrl: string
  supabaseKey: string
}

/**
 * Файлы плагина для стенда. Адрес сервиса — в манифест и код (__HUB_ORIGIN__); адрес и публичный ключ Supabase —
 * только в код (__SUPABASE_URL__, __SUPABASE_KEY__). Список доменов манифеста собирается здесь целиком:
 * сервис и, если есть Realtime, wss-адрес Supabase.
 */
export function buildPluginFiles(sources: Record<(typeof PLUGIN_FILES)[number], string>, { origin, supabaseUrl, supabaseKey }: PluginTarget) {
  // https://<проект>.supabase.co → wss://<проект>.supabase.co
  const realtime = supabaseUrl && supabaseKey ? new URL(supabaseUrl).origin.replace(/^http/, 'ws') : ''

  const manifest = JSON.parse(sources['manifest.json'])
  manifest.networkAccess.allowedDomains = [origin, realtime].filter(Boolean)

  return {
    'manifest.json': `${JSON.stringify(manifest, null, 2)}\n`,
    'code.js': sources['code.js']
      .replaceAll('__HUB_ORIGIN__', origin)
      .replaceAll('__SUPABASE_URL__', realtime ? supabaseUrl : '')
      .replaceAll('__SUPABASE_KEY__', realtime ? supabaseKey : ''),
    'ui.html': sources['ui.html']
  }
}
