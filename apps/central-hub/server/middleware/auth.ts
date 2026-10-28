// Весь сервис закрыт общим паролем. Без входа открыто только то,
// без чего не нарисовать страницу входа, и маршруты CLI — там обработчик требует токен.
const PUBLIC_PREFIXES = [
  '/api/auth/',
  '/api/cli/',
  '/api/_nuxt_icon/',
  '/_nuxt/',
  '/__nuxt',
  '/favicon.ico',
  '/robots.txt'
]

export default defineEventHandler(async (event) => {
  const { pathname, search } = getRequestURL(event)
  if (pathname === '/login' || PUBLIC_PREFIXES.some(prefix => pathname.startsWith(prefix))) return

  const session = await useHubSession(event)
  if (session.data.authed) return

  if (pathname.startsWith('/api/')) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized', message: 'Нужен вход' })
  }
  return sendRedirect(event, `/login?next=${encodeURIComponent(pathname + search)}`, 302)
})
