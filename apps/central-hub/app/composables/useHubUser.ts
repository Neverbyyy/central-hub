export interface HubUser {
  authed: boolean
  // Имя и адрес — из аккаунта Google; firstName — имя без фамилии, для приветствия
  name: string | null
  firstName: string | null
  email: string | null
  // Домен рабочих аккаунтов, которыми можно войти; null — вход через Google на стенде не настроен
  domain: string | null
}

export const useHubUser = () => useState<HubUser>('hub-user', () => signedOut(null))

/** Не вошёл. domain — настройка стенда: её сообщает сервер, при выходе сохраняем. */
export function signedOut(domain: string | null): HubUser {
  return { authed: false, name: null, firstName: null, email: null, domain }
}

/**
 * Для обработки ошибок API: при 401 (сессия кончилась) отправляет на /login и возвращает true.
 * Остальные ошибки, например 409 «ключ уже есть», — нет.
 * Вызывать в setup — роутер берётся оттуда.
 */
export function useAuthRedirect() {
  const user = useHubUser()
  const router = useRouter()

  return async (error: unknown) => {
    const { statusCode } = (error ?? {}) as { statusCode?: number }
    if (statusCode !== 401) return false
    user.value = signedOut(user.value.domain)
    await router.push({ path: '/login', query: { next: router.currentRoute.value.fullPath } })
    return true
  }
}

/**
 * Ошибка запроса — тостом с заголовком; кончилась сессия — на вход (useAuthRedirect).
 * Вызывать в setup.
 */
export function useNotifyError() {
  const authRedirect = useAuthRedirect()
  const toast = useToast()

  return async (title: string, error: unknown) => {
    if (!(await authRedirect(error))) toast.add({ title, description: errorMessage(error), color: 'error' })
  }
}
