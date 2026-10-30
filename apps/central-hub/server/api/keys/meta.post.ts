import { updateKeyMeta } from '../../lib/keys'

// Свойства ключа из панели: описание, теги, лимит длины, ссылка на Figma
export default defineHubHandler(async (event) => {
  const actor = await requireHubUser(event)
  const body = await readBody<{ key?: unknown, description?: unknown, tags?: unknown, maxLength?: unknown, figmaUrl?: unknown }>(event)
  if (typeof body?.key !== 'string' || !body.key) throw badRequest('Нужен key')

  return await updateKeyMeta(useDb(event), {
    key: body.key,
    description: body.description,
    tags: body.tags,
    maxLength: body.maxLength,
    figmaUrl: body.figmaUrl
  }, { actor })
})
