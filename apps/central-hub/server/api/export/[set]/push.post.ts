import { exportSet, loadSet } from '../../../lib/sync'

// Кнопка «Выгрузить»: утверждённые тексты — в свою ветку и PR. Основную ветку не трогает: мержит человек.
// Рабочие проекты (InApp, Pages Hub) — после дизайн-системы (requireReviewed); force — «Выгрузить без проверки»
export default defineHubHandler(async (event) => {
  const actor = await requireHubUser(event)
  const name = getRouterParam(event, 'set')!
  const force = (await readBody<{ force?: unknown } | undefined>(event))?.force === true

  // Сам набор не подключён — сразу понятная ошибка, без похода в базу и GitHub
  requireExportTarget(event, name)
  const db = useDb(event)
  const set = await loadSet(db, name)
  // Обход — только у набора, который ждёт проверку
  const forced = force && !!set.review_set
  // Проверка дизайн-системы и сборка файлов набора друг от друга не зависят — параллельно. В GitHub пишем только после
  // проверки: не прошла — 409, и до записи дело не доходит
  const [exported] = await Promise.all([exportSet(db, set), forced ? undefined : requireReviewed(event, set)])
  // Обход виден тому, кто ревьюит PR в рабочем репозитории
  const note = forced
    ? `Выгружено без проверки в «${exportProjectName(set.review_set!)}» — ${actor}. Тексты могли не пройти проверку в Storybook.`
    : undefined
  const result = await syncToGithub(event, exported, { actor, note })

  if (result.outcome === 'created' || result.outcome === 'updated' || result.outcome === 'closed') {
    const { error } = await db.from('export_runs').insert({
      set_name: name,
      outcome: result.outcome,
      revision: result.revision,
      pr_number: result.pr?.number ?? null,
      pr_url: result.pr?.url ?? null,
      changes: result.changes.map(({ path, added, changed, removed }) => ({ path, added, changed, removed })),
      actor,
      forced
    })
    // PR уже открыт — не прячем его из-за журнала
    if (error) console.error('[export_runs]', error)
    // Окна «Выгрузка в код» у коллег обновятся сразу — без вебхука GitHub и без переоткрытия
    await notifyExportChanged(event, name)
  }
  return result
})
