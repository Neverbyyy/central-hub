// Кнопка «Выгрузить»: утверждённые тексты — в свою ветку и PR. Основную ветку не трогает: мержит человек.
export default defineHubHandler(async (event) => {
  const actor = await requireHubUser(event)
  const set = getRouterParam(event, 'set')!
  const result = await exportToGithub(event, set, { actor })

  if (result.outcome === 'created' || result.outcome === 'updated' || result.outcome === 'closed') {
    const { error } = await useDb(event).from('export_runs').insert({
      set_name: set,
      outcome: result.outcome,
      revision: result.revision,
      pr_number: result.pr?.number ?? null,
      pr_url: result.pr?.url ?? null,
      changes: result.changes.map(({ path, added, changed, removed }) => ({ path, added, changed, removed })),
      actor
    })
    // PR уже открыт — не прячем его из-за журнала
    if (error) console.error('[export_runs]', error)
    // Окна «Выгрузка в код» у коллег обновятся сразу — без вебхука GitHub и без переоткрытия
    await notifyExportChanged(event, set)
  }
  return result
})
