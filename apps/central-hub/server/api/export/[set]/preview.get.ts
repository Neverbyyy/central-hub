import { syncExportToGithub } from '../../../lib/github'
import { exportSet } from '../../../lib/sync'

// Что уйдёт в PR, если нажать «Выгрузить»: сравнение с основной веткой, без записи
export default defineEventHandler(async (event) => {
  const set = getRouterParam(event, 'set')!
  const { token, target } = requireExportTarget(event, set)
  try {
    const { revision, files } = await exportSet(useDb(event), set)
    return { revision, ...await syncExportToGithub({ token, target, set, revision, files, actor: '', dryRun: true }) }
  } catch (error) {
    throwHubError(error)
  }
})
