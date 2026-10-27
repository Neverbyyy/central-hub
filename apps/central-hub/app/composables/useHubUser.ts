export interface HubUser {
  authed: boolean
  name: string | null
}

export const useHubUser = () => useState<HubUser>('hub-user', () => ({ authed: false, name: null }))

/**
 * Для обработки ошибок API: при 401 (сессия кончилась) и 409 (человек не представился)
 * отправляет на /login и возвращает true. Вызывать в setup — роутер берётся оттуда.
 */
export function useAuthRedirect() {
  const user = useHubUser()
  const router = useRouter()

  return async (error: unknown) => {
    const status = (error as { statusCode?: number } | null)?.statusCode
    if (status !== 401 && status !== 409) return false
    if (status === 401) user.value = { authed: false, name: null }
    await router.push({ path: '/login', query: { next: router.currentRoute.value.fullPath } })
    return true
  }
}
