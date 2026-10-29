import JSZip from 'jszip'

// Плагин Figma «Amaya Hub — тексты» для установки: Plugins → Development → Import plugin from manifest.
// За общим паролем. Плагин ходит в тот сервис, с которого его скачали (стенд, превью, localhost):
// адрес попадает в манифест и в код. Токена в архиве нет — дизайнер вставляет его в плагин сам.
const FILES = ['manifest.json', 'code.js', 'ui.html']

export default defineEventHandler(async (event) => {
  const origin = getRequestURL(event).origin
  const assets = useStorage('assets:figma-plugin')
  const zip = new JSZip()
  const folder = zip.folder('amaya-hub-figma')!
  for (const name of FILES) {
    const raw = await assets.getItemRaw<string | Uint8Array>(name)
    if (!raw) throw createError({ statusCode: 500, statusMessage: 'Plugin Missing', message: `В сборке нет файла плагина ${name}` })
    const text = typeof raw === 'string' ? raw : Buffer.from(raw).toString('utf8')
    folder.file(name, text.replaceAll('__HUB_ORIGIN__', origin))
  }
  setResponseHeaders(event, {
    'content-type': 'application/zip',
    'content-disposition': 'attachment; filename="amaya-hub-figma.zip"'
  })
  return zip.generateAsync({ type: 'nodebuffer' })
})
