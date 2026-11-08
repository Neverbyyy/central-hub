import JSZip from 'jszip'

// Плагин Figma «Amaya Hub — локализация» для установки: Plugins → Development → Import plugin from manifest.
// За общим паролем. Плагин ходит в тот сервис, с которого его скачали (стенд, превью, localhost):
// адрес попадает в манифест и в код. Токена в архиве нет — дизайнер вставляет его в плагин сам.
// Для мгновенного обновления — адрес Supabase и публичный ключ, те же, что у грида: ключ только читает,
// а событие Realtime для плагина лишь сигнал — тексты он всё равно берёт у сервиса по своему токену.
const FILES = ['manifest.json', 'code.js', 'ui.html']

export default defineEventHandler(async (event) => {
  const origin = getRequestURL(event).origin
  const supabase = useRuntimeConfig(event).public.supabase as { url?: string, key?: string } | undefined
  const supabaseUrl = supabase?.url ?? ''
  const supabaseKey = supabase?.key ?? ''
  // https://<проект>.supabase.co → wss://<проект>.supabase.co; без адреса или ключа плагин работает опросом
  const realtime = supabaseUrl && supabaseKey ? new URL(supabaseUrl).origin.replace(/^http/, 'ws') : ''

  const assets = useStorage('assets:figma-plugin')
  const zip = new JSZip()
  const folder = zip.folder('amaya-hub-figma')!
  for (const name of FILES) {
    const raw = await assets.getItemRaw<string | Uint8Array>(name)
    if (!raw) throw createError({ statusCode: 500, statusMessage: 'Plugin Missing', message: `В сборке нет файла плагина ${name}` })
    const text = (typeof raw === 'string' ? raw : Buffer.from(raw).toString('utf8')).replaceAll('__HUB_ORIGIN__', origin)
    if (name === 'manifest.json') {
      const manifest = JSON.parse(text)
      manifest.networkAccess.allowedDomains = [origin, realtime].filter(Boolean)
      folder.file(name, `${JSON.stringify(manifest, null, 2)}\n`)
    } else {
      folder.file(name, text
        .replaceAll('__SUPABASE_URL__', realtime ? supabaseUrl : '')
        .replaceAll('__SUPABASE_KEY__', realtime ? supabaseKey : ''))
    }
  }
  setResponseHeaders(event, {
    'content-type': 'application/zip',
    'content-disposition': 'attachment; filename="amaya-hub-figma.zip"'
  })
  return zip.generateAsync({ type: 'nodebuffer' })
})
