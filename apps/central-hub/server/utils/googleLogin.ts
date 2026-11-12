import type { H3Event } from 'h3'
import { companyDomain } from '../lib/google-auth'

/**
 * Вход через Google: клиент из Google Cloud и домен Workspace компании (кого пускать). Без клиента или домена — null:
 * войти нельзя никому.
 */
export function googleSettings(event: H3Event) {
  const config = useRuntimeConfig(event)
  const clientId = (config.googleClientId as string | undefined) ?? ''
  const clientSecret = (config.googleClientSecret as string | undefined) ?? ''
  const domain = companyDomain(config.authDomain as string | undefined)
  if (!clientId || !clientSecret || !domain) return null
  return { clientId, clientSecret, domain }
}

/**
 * Адрес возврата от Google — этого же сервиса. Он должен быть прописан у OAuth-клиента в Google Cloud
 * (основной стенд и localhost). За прокси Vercel адрес и схема — из X-Forwarded-*.
 */
export const googleRedirectUri = (event: H3Event) =>
  `${getRequestURL(event, { xForwardedHost: true, xForwardedProto: true }).origin}/api/auth/google/callback`
