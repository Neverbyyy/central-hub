import { translationQueue } from '../lib/keys'

// Очередь перевода: строки без перевода на язык или с устаревшим переводом
export default defineHubHandler(async (event) => {
  const { lang, prefix, limit } = getQuery(event)
  if (typeof lang !== 'string' || !lang) throw badRequest('Нужен lang')
  return await translationQueue(useDb(event), {
    lang,
    prefix: typeof prefix === 'string' ? prefix : undefined,
    limit: Number(limit) || 50
  })
})
