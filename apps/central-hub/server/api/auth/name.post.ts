export default defineEventHandler(async (event) => {
  const session = await useHubSession(event)
  if (!session.data.authed) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized', message: 'Нужен вход' })
  }

  const body = await readBody<{ name?: unknown }>(event)
  const name = typeof body?.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : ''
  if (name.length < 2 || name.length > 40) {
    throw badRequest('Имя — от 2 до 40 символов')
  }

  await session.update({ name })
  return { authed: true, name }
})
