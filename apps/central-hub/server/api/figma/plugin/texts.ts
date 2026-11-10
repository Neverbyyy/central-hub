import { figmaPluginTexts } from '../../../lib/figma'

// Тексты выборки для плагина: ?prefixes=common.,app.cars2.&langs=en,ru[&since=<now прошлого ответа>]
export default defineFigmaPluginHandler(async (event) => {
  const { since } = getQuery(event)
  return figmaPluginTexts(useDb(event), { ...figmaSelection(event), since: typeof since === 'string' && since ? since : undefined })
})
