import { figmaExport } from '../../lib/figma'

// Выборка для Figma: ?prefixes=common.,app.cars2.&langs=en,ru → { files: { en: …, ru: … } }, файл на язык = режим.
// Пока за общим паролем; токен для плагина — когда станет известно, каким плагином импортирует Антон.
export default defineEventHandler(async (event) => {
  const { prefixes, langs } = getQuery(event)
  if (typeof prefixes !== 'string' || !prefixes) throw badRequest('Нужен prefixes — разделы через запятую')
  const languages = typeof langs === 'string' && langs ? langs.split(',') : undefined

  try {
    return await figmaExport(useDb(event), { prefixes: prefixes.split(','), languages })
  } catch (error) {
    throwHubError(error)
  }
})
