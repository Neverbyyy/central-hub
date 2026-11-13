// Кто вошёл — для интерфейса. domain — домен рабочих аккаунтов, которыми можно войти; null — вход через Google
// на стенде не настроен (страница входа это объясняет)
export default defineEventHandler(async (event) => {
  const user = await hubUser(event)
  return {
    authed: !!user,
    name: user?.name ?? null,
    firstName: user?.firstName ?? null,
    email: user?.email ?? null,
    domain: googleSettings(event)?.domain ?? null
  }
})
