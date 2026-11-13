// Вход по общему паролю, шаг 1 (README, «Вход»): пароль — NUXT_HUB_PASSWORD. Верный — сессия ждёт имя, вход
// завершит шаг «Как вас зовут?» (/api/auth/name). Неверный — пауза: перебор медленнее
export default defineEventHandler(async (event) => {
  const expected = hubPassword(event)
  if (!expected) throw disabled('Password Login', 'Вход по паролю не настроен: на сервере нет NUXT_HUB_PASSWORD')

  const body = await readBody<{ password?: unknown }>(event)
  const password = typeof body?.password === 'string' ? body.password : ''
  if (!secretsEqual(password, expected)) {
    await new Promise(resolve => setTimeout(resolve, 500))
    throw unauthorized('Неверный пароль')
  }

  await startPasswordSession(event)
  return sendNoContent(event)
})
