// pnpm l10n <pull|diff|check> — CLI локализации для этого же монорепо: набор ds (amaya-l10n.json) → packages/locales.
// Токен — AMAYA_L10N_TOKEN, токен CLI стенда (NUXT_CLI_TOKEN в Vercel). Его можно положить в .env рядом с остальными:
// NUXT_CLI_TOKEN из .env не подходит — это токен локального сервиса, у стенда свой (как AMAYA_HUB_TOKEN у MCP)
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const root = join(import.meta.dirname, '..')
const env = join(root, '.env')
if (existsSync(env)) process.loadEnvFile(env)
if (!process.env.AMAYA_L10N_TOKEN) {
  console.error('Нужен AMAYA_L10N_TOKEN — токен CLI стенда (Vercel → Settings → Environment Variables → NUXT_CLI_TOKEN). Добавьте его в .env')
  process.exit(2)
}

const cli = join(root, 'packages/l10n-cli/amaya-l10n.mjs')
const { status } = spawnSync(process.execPath, [cli, ...process.argv.slice(2), '--cwd', root], { stdio: 'inherit' })
process.exit(status ?? 1)
