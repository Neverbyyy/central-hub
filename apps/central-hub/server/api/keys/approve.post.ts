// Утвердить переводы: статус «утверждён», пометка «устарел» снимается, текст уходит в выгрузку в проекты.
// { key, langs } — языки одного ключа (панель, очередь); { keys } — выделенные ключи целиком, все языки с текстом.
export default defineEventHandler(async (event) => {
  const actor = await requireHubUser(event)
  const body = await readBody<{ key?: unknown, langs?: unknown, keys?: unknown }>(event)

  if (body && 'keys' in body) {
    const { data, error } = await useDb(event).rpc('approve_keys', { p_keys: readKeys(body), p_actor: actor })
    if (error) throwDbError(error)
    return { count: data as number }
  }

  const { key, langs } = body ?? {}
  if (typeof key !== 'string' || !key) throw badRequest('Нужен key')
  if (!Array.isArray(langs) || !langs.length || langs.length > 50 || !langs.every(l => typeof l === 'string')) {
    throw badRequest('Нужен список языков')
  }

  const { data, error } = await useDb(event).rpc('approve_translations', { p_key: key, p_langs: langs, p_actor: actor })
  if (error) throwDbError(error)
  return { count: data as number }
})
