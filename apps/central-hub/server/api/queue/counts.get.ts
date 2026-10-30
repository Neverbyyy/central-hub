import { queueCounts } from '../../lib/keys'

// Сколько строк ждёт перевода на каждый язык: без перевода и устаревшие
export default defineHubHandler(async (event) => {
  const { prefix } = getQuery(event)
  return await queueCounts(useDb(event), { prefix: typeof prefix === 'string' ? prefix : undefined })
})
