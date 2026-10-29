import { figmaPluginTexts } from '../../../lib/figma'

// Тексты выборки для плагина: ?prefixes=common.,app.cars2.&langs=en,ru[&since=<now прошлого ответа>]
export default defineFigmaPluginHandler(async (event) => {
  const { prefixes, langs, since } = getQuery(event)
  if (typeof prefixes !== 'string' || !prefixes) throw badRequest('Нужен prefixes — разделы через запятую')
  return figmaPluginTexts(useDb(event), {
    prefixes: prefixes.split(','),
    languages: typeof langs === 'string' && langs ? langs.split(',') : undefined,
    since: typeof since === 'string' && since ? since : undefined
  })
})
