import { importSet } from '../../../lib/sync'

// `amaya-l10n import`: файлы проекта как есть → строки legacy.<проект>. и шаблоны выгрузки
export default defineEventHandler(async (event) => {
  requireToken(event, 'cli')

  const body = await readBody<{ files?: unknown, sourceRef?: unknown, actor?: unknown }>(event)
  const files = body?.files
  if (!files || typeof files !== 'object' || !Object.values(files).every(v => typeof v === 'string')) {
    throw badRequest('Нужны files: { язык: содержимое файла }')
  }
  const actor = typeof body?.actor === 'string' && body.actor.trim() ? body.actor.trim().slice(0, 60) : 'amaya-l10n'
  const sourceRef = typeof body?.sourceRef === 'string' ? body.sourceRef.slice(0, 200) : null

  try {
    return await importSet(useDb(event), getRouterParam(event, 'set')!, files as Record<string, string>, {
      actor: `${actor} (CLI)`,
      sourceRef
    })
  } catch (error) {
    throwHubError(error)
  }
})
