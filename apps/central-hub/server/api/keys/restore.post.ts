export default defineEventHandler(async (event) => {
  const actor = await requireHubUser(event)
  const keys = readKeys(await readBody(event))

  const { data, error } = await useDb(event).rpc('restore_keys', { p_keys: keys, p_actor: actor, p_source: 'ui' })
  if (error) throwDbError(error)
  return { count: data as number }
})
