import { createKey } from '../../lib/keys'

// Новый ключ из интерфейса: имя по правилам, описание обязательно. Текст необязателен — его вписывают
// потом в гриде или через MCP; если пришёл, сохраняется черновиком
export default defineEventHandler(async (event) => {
  const actor = await requireHubUser(event)
  const body = await readBody<{ key?: unknown, description?: unknown, en?: unknown, tags?: unknown, maxLength?: unknown }>(event)
  if (typeof body?.key !== 'string' || typeof body.description !== 'string' || (body.en !== undefined && typeof body.en !== 'string')) {
    throw badRequest('Нужны key и description строками, en — строкой, если есть')
  }
  const maxLength = body.maxLength === undefined || body.maxLength === null || body.maxLength === '' ? null : Number(body.maxLength)

  try {
    return await createKey(useDb(event), {
      key: body.key,
      description: body.description,
      translations: body.en ? { en: body.en } : {},
      tags: body.tags as string[] | undefined,
      maxLength
    }, { actor, source: 'ui', status: 'draft' })
  } catch (error) {
    throwHubError(error)
  }
})
