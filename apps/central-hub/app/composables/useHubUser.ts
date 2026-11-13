export interface HubUser {
  authed: boolean
  // Общий пароль верный, имени ещё нет — страница входа спрашивает «Как вас зовут?»
  nameRequired: boolean
  // Имя — из аккаунта Google или введённое при входе по паролю; firstName — имя без фамилии, для приветствия
  name: string | null
  firstName: string | null
  // Только у входа через Google
  email: string | null
  // Как можно войти на стенде: домен рабочих аккаунтов Google (null — вход через Google не настроен)
  // и общий пароль
  domain: string | null
  passwordLogin: boolean
}

export const useHubUser = () => useState<HubUser>('hub-user', () => signedOut({ domain: null, passwordLogin: false }))

/** Не вошёл. Как можно войти — настройка стенда: её сообщает сервер, при выходе сохраняем. */
export function signedOut({ domain, passwordLogin }: Pick<HubUser, 'domain' | 'passwordLogin'>): HubUser {
  return { authed: false, nameRequired: false, name: null, firstName: null, email: null, domain, passwordLogin }
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
    user.value = signedOut(user.value)
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
