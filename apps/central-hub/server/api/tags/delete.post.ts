import { deleteTag } from '../../lib/tags'

// Удалить тег: снимается со всех ключей, в их истории это остаётся
export default defineHubHandler(async (event) => {
  const actor = await requireHubUser(event)
  const body = await readBody<{ name?: unknown }>(event)
  return await deleteTag(useDb(event), body?.name, { actor })
})
