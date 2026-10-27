// Строки не удаляются: «устаревшие» пропадают из грида и выгрузок, но остаются с историей
export default defineEventHandler(async (event) => {
  const actor = await requireHubUser(event)
  const keys = readKeys(await readBody(event))

  const { data, error } = await useDb(event).rpc('deprecate_keys', { p_keys: keys, p_actor: actor, p_source: 'ui' })
  if (error) throwDbError(error)
  return { count: data as number }
})
