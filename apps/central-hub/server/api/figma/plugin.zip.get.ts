import JSZip from 'jszip'
import { buildPluginFiles, PLUGIN_FILES } from '../../lib/figma-plugin'

// Плагин Figma «Amaya Hub — локализация» для установки: Plugins → Development → Import plugin from manifest.
// Только после входа. Плагин ходит в тот сервис, с которого его скачали (стенд, превью, localhost):
// адрес попадает в манифест и в код. Токена в архиве нет — дизайнер вставляет его в плагин сам.
// Для мгновенного обновления — адрес Supabase и публичный ключ, те же, что у грида: ключ только читает,
// а событие Realtime для плагина лишь сигнал — тексты он всё равно берёт у сервиса по своему токену.
export default defineEventHandler(async (event) => {
  const supabase = useRuntimeConfig(event).public.supabase as { url?: string, key?: string } | undefined

  const assets = useStorage('assets:figma-plugin')
  const sources = {} as Record<(typeof PLUGIN_FILES)[number], string>
  for (const name of PLUGIN_FILES) {
    const raw = await assets.getItemRaw<string | Uint8Array>(name)
    if (!raw) throw createError({ statusCode: 500, statusMessage: 'Plugin Missing', message: `В сборке нет файла плагина ${name}` })
    sources[name] = typeof raw === 'string' ? raw : Buffer.from(raw).toString('utf8')
  }

  const files = buildPluginFiles(sources, { origin: getRequestURL(event).origin, supabaseUrl: supabase?.url ?? '', supabaseKey: supabase?.key ?? '' })
  const zip = new JSZip()
  const folder = zip.folder('amaya-hub-figma')!
  for (const name of PLUGIN_FILES) folder.file(name, files[name])

  setResponseHeaders(event, {
    'content-type': 'application/zip',
    'content-disposition': 'attachment; filename="amaya-hub-figma.zip"'
  })
  return zip.generateAsync({ type: 'nodebuffer' })
})
