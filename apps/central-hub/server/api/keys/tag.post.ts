import { setKeysTag } from '../../lib/tags'

// Поставить или снять тег у ключей — правый клик по строке (или по выделенным) в таблице
export default defineHubHandler(async (event) => {
  const actor = await requireHubUser(event)
  const body = await readBody<{ keys?: unknown, tag?: unknown, on?: unknown }>(event)
  return await setKeysTag(useDb(event), { keys: readKeys(body), tag: body?.tag, on: body?.on }, { actor })
})
