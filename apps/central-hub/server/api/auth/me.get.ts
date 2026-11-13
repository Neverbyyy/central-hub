// Кто вошёл — для интерфейса. nameRequired — общий пароль верный, но имени ещё нет: страница входа спрашивает
// «Как вас зовут?». Как можно войти на этом стенде: domain — домен рабочих аккаунтов Google (null — вход через Google
// не настроен), passwordLogin — задан общий пароль. Страница входа показывает только настроенное
export default defineEventHandler(async (event) => {
  const { user, nameRequired } = await hubLogin(event)
  return {
    authed: !!user,
    nameRequired,
    name: user?.name ?? null,
    firstName: user?.firstName ?? null,
    // Только у входа через Google
    email: user?.email ?? null,
    domain: googleSettings(event)?.domain ?? null,
    passwordLogin: !!hubPassword(event)
  }
})
