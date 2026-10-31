import { prEventForSet, verifyGithubSignature } from '../../lib/github-webhook'

// Вебхук GitHub о событиях PR (Settings → Webhooks → Pull requests). Без пароля сервиса — защищён подписью.
// PR своей ветки открыт, смержен или закрыт — сообщаем открытым окнам «Выгрузка в код», они перечитывают статус
export default defineEventHandler(async (event) => {
  const secret = useRuntimeConfig(event).githubWebhookSecret as string
  if (!secret) {
    throw createError({ statusCode: 503, statusMessage: 'Webhook Disabled', message: 'NUXT_GITHUB_WEBHOOK_SECRET не задан на сервере' })
  }
  const raw = (await readRawBody(event, false)) ?? Buffer.alloc(0)
  if (!verifyGithubSignature(raw, getHeader(event, 'x-hub-signature-256'), secret)) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized', message: 'Неверная подпись вебхука' })
  }

  // GitHub проверяет вебхук сразу после настройки
  const name = getHeader(event, 'x-github-event')
  if (name === 'ping') return { ok: true }

  let payload: unknown
  try {
    payload = JSON.parse(raw.toString('utf8'))
  } catch {
    throw badRequest('Тело вебхука — не JSON')
  }
  const pr = prEventForSet(name, payload, exportRepos(event))
  if (!pr) return { ok: true, ignored: true }

  // Ответ GitHub не ждёт рассылки по существу: не дошла — в лог, повторять вебхук незачем
  const db = useDb(event)
  const channel = db.channel(EXPORT_PR_CHANNEL)
  try {
    await channel.httpSend('pr', { set: pr.set })
  } catch (error) {
    console.error('[github-webhook] рассылка не дошла', error)
  } finally {
    await db.removeChannel(channel)
  }
  return { ok: true, ...pr }
})
