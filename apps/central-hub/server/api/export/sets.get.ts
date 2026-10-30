import { findOpenPr } from '../../lib/github'
import { pendingApproval } from '../../lib/sync'

// Наборы для окна «Выгрузка в код»: куда уходят, сколько ждёт утверждения, последняя выгрузка и открытый PR
export default defineEventHandler(async (event) => {
  const db = useDb(event)
  const repos = exportRepos(event)
  const token = useRuntimeConfig(event).githubToken as string

  const { data: sets, error } = await db.from('export_sets').select('name, project, path_template').order('name')
  if (error) throwDbError(error)

  // Открытый PR — одним запросом к GitHub, чтобы кнопка сразу была «Обновить PR #N».
  // GitHub не ответил — не беда: предпросмотр всё равно уточнит
  const openPr = async (set: string) => {
    const target = repos.get(set)
    if (!token || !target) return null
    try {
      return await findOpenPr({ token, target, set })
    } catch (error) {
      console.error('[export] открытый PR', set, error)
      return null
    }
  }

  try {
    return await Promise.all((sets as { name: string, project: string, path_template: string }[]).map(async (set) => {
      const [pending, last, pr] = await Promise.all([
        pendingApproval(db, set.name),
        db.from('export_runs')
          .select('outcome, pr_number, pr_url, actor, created_at')
          .eq('set_name', set.name)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        openPr(set.name)
      ])
      if (last.error) throw last.error
      return {
        name: set.name,
        project: set.project,
        path: set.path_template,
        repo: repos.get(set.name) ?? null,
        // Репозиторий указан, но токена нет — выгружать нечем
        connected: !!token && repos.has(set.name),
        pending,
        lastRun: last.data,
        openPr: pr
      }
    }))
  } catch (error) {
    throwHubError(error)
  }
})
