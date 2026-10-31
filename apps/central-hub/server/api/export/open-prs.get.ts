import { findOpenPr } from '../../lib/github'

// Открытые PR выгрузки — для баджа на кнопке «Выгрузить в код»: какой набор, номер и кто выгрузил последним.
// Легче /api/export/sets: только GitHub по открытому PR и одна строка журнала на набор
export default defineHubHandler(async (event) => {
  const token = useRuntimeConfig(event).githubToken as string
  if (!token) return []
  const db = useDb(event)

  const list = await Promise.all([...exportRepos(event)].map(async ([set, target]) => {
    try {
      const pr = await findOpenPr({ token, target, set })
      if (!pr) return null
      const { data } = await db.from('export_runs')
        .select('actor, created_at')
        .eq('set_name', set)
        .eq('pr_number', pr.number)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      return { set, ...pr, actor: (data?.actor as string | undefined) ?? null, at: (data?.created_at as string | undefined) ?? null }
    } catch (error) {
      // GitHub не ответил — без баджа для этого набора, окно выгрузки всё равно покажет правду
      console.error('[export] открытые PR', set, error)
      return null
    }
  }))
  return list.filter(item => item !== null)
})
