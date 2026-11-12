import { renameTag } from '../../lib/tags'

// Переименовать тег у всех ключей (в истории каждого ключа это видно)
export default defineHubHandler(async (event) => {
  const actor = await requireHubUser(event)
  const body = await readBody<{ from?: unknown, to?: unknown }>(event)
  return await renameTag(useDb(event), { from: body?.from, to: body?.to }, { actor })
})
