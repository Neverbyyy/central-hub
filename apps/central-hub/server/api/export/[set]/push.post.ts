import { syncExportToGithub } from '../../../lib/github'
import { exportSet } from '../../../lib/sync'

// Кнопка «Выгрузить»: утверждённые тексты — в свою ветку и PR. Основную ветку не трогает: мержит человек.
export default defineHubHandler(async (event) => {
  const actor = await requireHubUser(event)
  const set = getRouterParam(event, 'set')!
  const { token, target } = requireExportTarget(event, set)
  const db = useDb(event)

  const { revision, files } = await exportSet(db, set)
  const result = await syncExportToGithub({ token, target, set, revision, files, actor })

  if (result.outcome === 'created' || result.outcome === 'updated' || result.outcome === 'closed') {
    const { error } = await db.from('export_runs').insert({
      set_name: set,
      outcome: result.outcome,
      revision,
      pr_number: result.pr?.number ?? null,
      pr_url: result.pr?.url ?? null,
      changes: result.changes.map(({ path, added, changed, removed }) => ({ path, added, changed, removed })),
      actor
    })
    // PR уже открыт — не прячем его из-за журнала
    if (error) console.error('[export_runs]', error)
  }
  return { revision, ...result }
})
