import { exportSet } from '../../../lib/sync'

// Файлы набора для `amaya-l10n pull` / `diff`
export default defineHubHandler(async (event) => {
  requireToken(event, 'cli')
  return await exportSet(useDb(event), getRouterParam(event, 'set')!)
})
