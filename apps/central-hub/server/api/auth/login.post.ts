export default defineEventHandler(async (event) => {
  const { hubPassword } = useRuntimeConfig(event)
  if (!hubPassword) {
    throw createError({ statusCode: 500, statusMessage: 'Server Misconfigured', message: 'NUXT_HUB_PASSWORD не задан' })
  }

  const body = await readBody<{ password?: unknown }>(event)
  const password = typeof body?.password === 'string' ? body.password : ''

  if (!secretsEqual(password, hubPassword)) {
    // Пауза замедляет перебор
    await new Promise(resolve => setTimeout(resolve, 500))
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized', message: 'Неверный пароль' })
  }

  const session = await useHubSession(event)
  await session.update({ authed: true })
  return { authed: true, name: session.data.name ?? null }
})
