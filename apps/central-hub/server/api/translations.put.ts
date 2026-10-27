import { MAX_VALUE_LENGTH } from '@amaya/l10n-core'

// Сохраняет перевод одной ячейки. Существование ключа и языка проверяет set_translation в базе.
export default defineEventHandler(async (event) => {
  const actor = await requireHubUser(event)

  const body = await readBody<{ key?: unknown, lang?: unknown, value?: unknown }>(event)
  const { key, lang, value } = body ?? {}
  if (typeof key !== 'string' || !key || typeof lang !== 'string' || !lang || typeof value !== 'string') {
    throw badRequest('Нужны key, lang и value строками')
  }
  if (value.length > MAX_VALUE_LENGTH) {
    throw badRequest(`Текст длиннее ${MAX_VALUE_LENGTH} символов`)
  }

  const { data, error } = await useDb(event).rpc('set_translation', {
    p_key: key,
    p_lang: lang,
    p_value: value,
    p_actor: actor,
    p_source: 'ui'
  })
  if (error) throwDbError(error)
  return { updated_at: data as string }
})
