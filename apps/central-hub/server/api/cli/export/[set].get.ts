import { exportSet } from '../../../lib/sync'

// Файлы набора для `amaya-l10n pull` / `diff`
export default defineEventHandler(async (event) => {
  requireCliToken(event)
  try {
    return await exportSet(useDb(event), getRouterParam(event, 'set')!)
  } catch (error) {
    throwSyncError(error)
  }
})
