import { exportSet } from '../../../lib/sync'

// Файлы набора для `amaya-l10n pull` / `diff`
export default defineTokenHandler('cli', event => exportSet(useDb(event), getRouterParam(event, 'set')!))
