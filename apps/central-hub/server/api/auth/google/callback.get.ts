import { exchangeCode, googleFirstName, googleName, isAllowed, readIdToken, type GoogleClaims } from '../../../lib/google-auth'

// Возврат от Google: проверяем, что это тот самый вход (state), меняем код на id_token, проверяем его и домен.
// Удалось — сессия с адресом и именем из Google; нет — на /login с понятной причиной (?error=)
export default defineEventHandler(async (event) => {
  const google = googleSettings(event)
  if (!google) return sendRedirect(event, '/login?error=off', 302)

  // Данные входа — один раз: читаем и сразу стираем
  const oauth = await useOAuthSession(event)
  const { state, nonce, verifier, next } = oauth.data
  await oauth.clear()

  const query = getQuery(event)
  const fail = (error: string, extra: Record<string, string> = {}) =>
    sendRedirect(event, `/login?${new URLSearchParams({ error, ...extra, ...(next && next !== '/' ? { next } : {}) })}`, 302)

  // Человек нажал «Отмена» в окне Google
  if (query.error) return fail('denied')
  if (!state || !nonce || !verifier || typeof query.state !== 'string' || !secretsEqual(query.state, state)) return fail('state')
  if (typeof query.code !== 'string' || !query.code) return fail('state')

  let claims: GoogleClaims
  try {
    const idToken = await exchangeCode({ code: query.code, verifier, redirectUri: googleRedirectUri(event), clientId: google.clientId, clientSecret: google.clientSecret })
    claims = readIdToken(idToken, { clientId: google.clientId, nonce })
  } catch (error) {
    console.error('[auth] вход через Google', error)
    return fail('google')
  }

  if (!isAllowed(claims, google.domain)) return fail('not-allowed', { email: claims.email })

  await startHubSession(event, { email: claims.email.toLowerCase(), name: googleName(claims), firstName: googleFirstName(claims) })
  return sendRedirect(event, internalPath(next), 302)
})
