import { figmaExport } from '../../lib/figma'

// Выборка для встроенного импорта Figma: ?prefixes=common.,app.cars2.&langs=en,ru → { files: { en: …, ru: … } },
// файл на язык = режим. За общим паролем; плагин ходит в /api/figma/plugin/* со своим токеном.
export default defineHubHandler(async (event) => {
  const { prefixes, langs } = getQuery(event)
  if (typeof prefixes !== 'string' || !prefixes) throw badRequest('Нужен prefixes — разделы через запятую')
  const languages = typeof langs === 'string' && langs ? langs.split(',') : undefined

  return await figmaExport(useDb(event), { prefixes: prefixes.split(','), languages })
})
