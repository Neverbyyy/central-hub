import { renameTag } from '../../lib/tags'

// Переименовать тег у всех ключей. В историю ключей теги не пишутся (миграция 20261113100000)
export default defineHubHandler(async (event) => {
  const actor = await requireHubUser(event)
  const body = await readBody<{ from?: unknown, to?: unknown }>(event)
  return await renameTag(useDb(event), { from: body?.from, to: body?.to }, { actor })
})
