import { exportSet } from '../../../lib/sync'

// Файлы набора для `amaya-l10n pull` / `diff`
export default defineEventHandler(async (event) => {
  requireToken(event, 'cli')
  try {
    return await exportSet(useDb(event), getRouterParam(event, 'set')!)
  } catch (error) {
    throwHubError(error)
  }
})
