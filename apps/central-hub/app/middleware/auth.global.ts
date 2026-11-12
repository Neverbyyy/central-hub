// Без входа сервер страницу не отдаст (server/middleware/auth.ts). Здесь — переходы внутри приложения
export default defineNuxtRouteMiddleware((to) => {
  if (to.path === '/login') return
  const user = useHubUser()
  if (!user.value.authed) {
    return navigateTo({ path: '/login', query: { next: to.fullPath } })
  }
})
