// Без пароля сервер страницу не отдаст (server/middleware/auth.ts).
// Здесь — переходы внутри приложения и просьба представиться.
export default defineNuxtRouteMiddleware((to) => {
  if (to.path === '/login') return
  const user = useHubUser()
  if (!user.value.authed || !user.value.name) {
    return navigateTo({ path: '/login', query: { next: to.fullPath } })
  }
})
