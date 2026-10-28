import { queueCounts } from '../../lib/keys'

// Сколько строк ждёт перевода на каждый язык: без перевода и устаревшие
export default defineEventHandler(async (event) => {
  const { prefix } = getQuery(event)
  try {
    return await queueCounts(useDb(event), { prefix: typeof prefix === 'string' ? prefix : undefined })
  } catch (error) {
    throwHubError(error)
  }
})
