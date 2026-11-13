// Весь сервис — только после входа (через Google или по общему паролю). Без входа открыто только то, без чего не нарисовать страницу
// входа и не пройти сам вход (/api/auth/), маршруты CLI, MCP и плагина Figma — там обработчик требует токен —
// и вебхук GitHub (подпись).
const PUBLIC_PREFIXES = [
  '/api/auth/',
  '/api/cli/',
  '/api/figma/plugin/',
  // Вебхук GitHub — без входа, но с подписью секретом NUXT_GITHUB_WEBHOOK_SECRET
  '/api/github/webhook',
  '/mcp',
  '/api/_nuxt_icon/',
  '/_nuxt/',
  '/__nuxt',
  '/favicon.ico',
  '/robots.txt'
]

export default defineEventHandler(async (event) => {
  const { pathname, search } = getRequestURL(event)
  if (pathname === '/login' || PUBLIC_PREFIXES.some(prefix => pathname.startsWith(prefix))) return

  // Вошёл — правило одно для всех (hubUser): cookie прежнего входа паролем, до входа через Google, не в счёт
  if (await hubUser(event)) return

  if (pathname.startsWith('/api/')) {
    throw unauthorized()
  }
  return sendRedirect(event, `/login?next=${encodeURIComponent(pathname + search)}`, 302)
})
