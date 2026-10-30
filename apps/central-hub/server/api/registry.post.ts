import { addRegistryCode } from '../lib/keys'

// Новый код игры, сайта, бренда или теста — прямо из формы создания ключа
export default defineHubHandler(async (event) => {
  await requireHubUser(event)
  const body = await readBody<{ kind?: unknown, code?: unknown, title?: unknown }>(event)
  if (typeof body?.kind !== 'string' || typeof body.code !== 'string' || typeof body.title !== 'string') {
    throw badRequest('Нужны kind, code и title строками')
  }
  return await addRegistryCode(useDb(event), { kind: body.kind, code: body.code, title: body.title })
})
