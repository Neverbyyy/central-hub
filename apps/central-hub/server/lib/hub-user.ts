// Кто вошёл — по данным cookie сессии. Два входа: через Google (адрес и имя из профиля) и по общему паролю (имя
// человек вводит сам). Без Nuxt-глобалов: сессия (server/utils/session.ts), маршруты входа и тесты.
import { firstWord } from './google-auth'

export type LoginMethod = 'google' | 'password'

export interface HubSessionData {
  email?: string
  // Подписывает правки в истории, его видят коллеги
  name?: string
  // Имя без фамилии — приветствие на главной. У сессий до этого поля — первое слово name
  firstName?: string
  // Как вошёл. У сессий Google до этого поля его нет — их узнаём по адресу
  via?: LoginMethod
}

export interface SignedInUser {
  // Только у входа через Google
  email: string | null
  name: string
  firstName: string
  via: LoginMethod
}

/**
 * Сессия → кто вошёл; null — не вошёл. Вход по паролю — с пометкой via: cookie прежнего входа паролем
 * ({ authed, name }, до входа через Google) её не несут и входом не считаются — их отключили при переходе на Google.
 */
export function sessionUser(data: HubSessionData): SignedInUser | null {
  const name = data.name
  if (!name) return null
  const firstName = data.firstName || firstWord(name)
  if (data.via === 'password') return { email: null, name, firstName, via: 'password' }
  if (data.email) return { email: data.email, name, firstName, via: 'google' }
  return null
}

/**
 * Общий пароль верный, а имени ещё нет: страница входа спрашивает «Как вас зовут?» (/api/auth/name). Это ещё не вход —
 * sessionUser такой сессии не пускает.
 */
export const awaitsName = (data: HubSessionData) => data.via === 'password' && !data.name

/** Что положить в сессию при входе: только поля этого входа. */
export function sessionData(user: SignedInUser): HubSessionData {
  const data: HubSessionData = { name: user.name, firstName: user.firstName, via: user.via }
  if (user.email) data.email = user.email
  return data
}
