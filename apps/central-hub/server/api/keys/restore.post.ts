// Вернуть ключи из устаревших; база не даст, если место ключа уже занял новый
export default defineEventHandler(async (event) => {
  const actor = await requireHubUser(event)
  return rpcCount(event, 'restore_keys', { p_keys: readKeys(await readBody(event)), p_actor: actor, p_source: 'ui' })
})
