import { deleteTag } from '../../lib/tags'

// Удалить тег: снимается со всех ключей. В историю ключей теги не пишутся (миграция 20261113100000)
export default defineHubHandler(async (event) => {
  const actor = await requireHubUser(event)
  const body = await readBody<{ name?: unknown }>(event)
  return await deleteTag(useDb(event), body?.name, { actor })
})
