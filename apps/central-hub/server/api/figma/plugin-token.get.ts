// Общий токен плагина Figma — тем, кто вошёл в сервис (маршрут за паролем и именем, не под /api/figma/plugin/):
// его копируют в окне «Тексты в Figma», а не просят у владельца. Значение — из NUXT_FIGMA_TOKEN, в коде его нет:
// сменить токен — поменять переменную на Vercel
export default defineHubHandler(async (event) => {
  await requireHubUser(event)
  setResponseHeader(event, 'cache-control', 'no-store')
  const token = useRuntimeConfig(event).figmaToken as string
  return { token: token || null }
})
