// Строки не удаляются: «устаревшие» пропадают из грида и выгрузок, но остаются с историей
export default defineEventHandler(async (event) => {
  const actor = await requireHubUser(event)
  return rpcCount(event, 'deprecate_keys', { p_keys: readKeys(await readBody(event)), p_actor: actor, p_source: 'ui' })
})
