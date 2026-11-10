// Общие токены, которые видит каждый, кто вошёл: плагина Figma (окно «Тексты в Figma») и MCP (Настройки). Их копируют
// сами, а не просят у владельца. Маршрут за паролем и именем — не под исключениями middleware. Значение — из переменной
// окружения, в коде его нет: сменить токен — поменять переменную на Vercel. Токена CLI здесь нет: он нужен CI и .env
// проектов, а не людям в интерфейсе
const SHARED = ['figma', 'mcp'] as const
type SharedKind = (typeof SHARED)[number]

export default defineHubHandler(async (event) => {
  await requireHubUser(event)
  const kind = getRouterParam(event, 'kind') as SharedKind
  if (!SHARED.includes(kind)) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found', message: 'Такого токена нет' })
  }
  setResponseHeader(event, 'cache-control', 'no-store')
  const token = useRuntimeConfig(event)[TOKENS[kind].config] as string
  return { token: token || null }
})
