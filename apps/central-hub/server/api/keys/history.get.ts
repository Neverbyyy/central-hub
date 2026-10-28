// История ключа для панели — публичному ключу она недоступна, поэтому через сервер
export default defineEventHandler(async (event) => {
  const { key } = getQuery(event)
  if (typeof key !== 'string' || !key) throw badRequest('Нужен key')

  const { data, error } = await useDb(event)
    .from('history')
    .select('id, lang, field, old_value, new_value, actor, source, created_at')
    .eq('technical_key', key)
    .order('id', { ascending: false })
    .limit(100)
  if (error) throwDbError(error)
  return data
})
