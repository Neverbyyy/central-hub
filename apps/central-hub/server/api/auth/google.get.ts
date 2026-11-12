import { googleAuthUrl, pkcePair, randomToken } from '../../lib/google-auth'

// «Войти через Google»: state, nonce и PKCE — в короткую зашифрованную cookie, человек — к Google выбирать аккаунт.
// Вернётся на /api/auth/google/callback
export default defineEventHandler(async (event) => {
  const google = googleSettings(event)
  if (!google) return sendRedirect(event, '/login?error=off', 302)

  const state = randomToken()
  const nonce = randomToken()
  const { verifier, challenge } = pkcePair()
  const oauth = await useOAuthSession(event)
  await oauth.update({ state, nonce, verifier, next: internalPath(getQuery(event).next) })

  // hd — Google сразу предложит рабочие аккаунты компании (подсказка; проверка — при возврате)
  return sendRedirect(event, googleAuthUrl({ clientId: google.clientId, redirectUri: googleRedirectUri(event), state, nonce, codeChallenge: challenge, hd: google.domain }), 302)
})
