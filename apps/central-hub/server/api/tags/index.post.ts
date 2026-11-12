import { createTag } from '../../lib/tags'

// Новый тег без ключей: со страницы «Теги», из меню правого клика и из форм ключа
export default defineHubHandler(async (event) => {
  const actor = await requireHubUser(event)
  const body = await readBody<{ name?: unknown }>(event)
  return await createTag(useDb(event), body?.name, { actor })
})
