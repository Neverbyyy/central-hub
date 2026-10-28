import { createKey } from '../../lib/keys'

// Новый ключ из интерфейса: имя по правилам, описание обязательно, тексты — черновики
export default defineEventHandler(async (event) => {
  const actor = await requireHubUser(event)
  const body = await readBody<{ key?: unknown, description?: unknown, en?: unknown, tags?: unknown, maxLength?: unknown }>(event)
  if (typeof body?.key !== 'string' || typeof body.description !== 'string' || typeof body.en !== 'string') {
    throw badRequest('Нужны key, description и en строками')
  }
  const maxLength = body.maxLength === undefined || body.maxLength === null || body.maxLength === '' ? null : Number(body.maxLength)

  try {
    return await createKey(useDb(event), {
      key: body.key,
      description: body.description,
      translations: { en: body.en },
      tags: body.tags as string[] | undefined,
      maxLength
    }, { actor, source: 'ui', status: 'draft' })
  } catch (error) {
    throwHubError(error)
  }
})
