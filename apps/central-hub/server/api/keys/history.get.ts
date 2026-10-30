import { keyHistory } from '../../lib/history'

// История ключа действиями, порциями — публичному ключу она недоступна, поэтому через сервер
export default defineHubHandler(async (event) => {
  const { key, offset, limit } = getQuery(event)
  if (typeof key !== 'string' || !key) throw badRequest('Нужен key')
  const from = Math.max(Number(offset) || 0, 0)
  const size = Math.min(Math.max(Number(limit) || 10, 1), 50)

  return await keyHistory(useDb(event), key, { offset: from, limit: size })
})
