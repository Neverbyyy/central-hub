import { loadSet } from '../../../lib/sync'

// Кнопка «Выгрузить»: утверждённые тексты — в свою ветку и PR. Основную ветку не трогает: мержит человек.
// Рабочие проекты (InApp, Pages Hub) — после дизайн-системы (requireReviewed); force — «Выгрузить без проверки»
export default defineHubHandler(async (event) => {
  const actor = await requireHubUser(event)
  const set = getRouterParam(event, 'set')!
  const force = (await readBody<{ force?: unknown } | undefined>(event))?.force === true

  // Сам набор не подключён — сразу понятная ошибка, без похода в GitHub за проверкой
  requireExportTarget(event, set)
  const info = await loadSet(useDb(event), set)
  if (!force) await requireReviewed(event, info, actor)
  // Обход проверки виден тому, кто ревьюит PR в рабочем репозитории
  const note = force && info.review_set
    ? `Выгружено без проверки в «${exportProjectName(info.review_set)}» — ${actor}. Тексты могли не пройти проверку в Storybook.`
    : undefined
  const result = await exportToGithub(event, set, { actor, note })

  if (result.outcome === 'created' || result.outcome === 'updated' || result.outcome === 'closed') {
    const { error } = await useDb(event).from('export_runs').insert({
      set_name: set,
      outcome: result.outcome,
      revision: result.revision,
      pr_number: result.pr?.number ?? null,
      pr_url: result.pr?.url ?? null,
      changes: result.changes.map(({ path, added, changed, removed }) => ({ path, added, changed, removed })),
      actor,
      forced: !!note
    })
    // PR уже открыт — не прячем его из-за журнала
    if (error) console.error('[export_runs]', error)
    // Окна «Выгрузка в код» у коллег обновятся сразу — без вебхука GitHub и без переоткрытия
    await notifyExportChanged(event, set)
  }
  return result
})
