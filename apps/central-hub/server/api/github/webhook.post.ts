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

  // Рассылка не дошла — в лог, повторять вебхук незачем: GitHub получает 200
  await notifyExportChanged(event, pr.set)
  return { ok: true, ...pr }
})
