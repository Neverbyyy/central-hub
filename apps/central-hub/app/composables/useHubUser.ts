export interface HubUser {
  authed: boolean
  name: string | null
}

export const useHubUser = () => useState<HubUser>('hub-user', () => ({ authed: false, name: null }))

/**
 * Для обработки ошибок API: при 401 (сессия кончилась) и 403 «Name Required» (человек не представился)
 * отправляет на /login и возвращает true. Остальные ошибки, например 409 «ключ уже есть», — нет.
 * Вызывать в setup — роутер берётся оттуда.
 */
export function useAuthRedirect() {
  const user = useHubUser()
  const router = useRouter()

  return async (error: unknown) => {
    const { statusCode, statusMessage } = (error ?? {}) as { statusCode?: number, statusMessage?: string }
    const needsName = statusCode === 403 && statusMessage === 'Name Required'
    if (statusCode !== 401 && !needsName) return false
    if (statusCode === 401) user.value = { authed: false, name: null }
    await router.push({ path: '/login', query: { next: router.currentRoute.value.fullPath } })
    return true
  }
}
