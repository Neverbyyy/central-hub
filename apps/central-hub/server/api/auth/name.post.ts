import { firstWord } from '../../lib/google-auth'

// Вход по общему паролю, шаг 2 — «Как вас зовут?»: имя подписывает правки в истории. Только в сессии, начатой верным
// общим паролем (/api/auth/password); у входа через Google имя из профиля, его здесь не сменить
export default defineEventHandler(async (event) => {
  const { data } = await useHubSession(event)
  if (data.via !== 'password') throw unauthorized('Сначала введите общий пароль')

  const body = await readBody<{ name?: unknown }>(event)
  const name = cleanLoginName(typeof body?.name === 'string' ? body.name : '')
  const message = loginNameError(name)
  if (message) throw badRequest(message)

  await startHubSession(event, { email: null, name, firstName: firstWord(name), via: 'password' })
  return sendNoContent(event)
})
