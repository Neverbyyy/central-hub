import type { H3Event } from 'h3'
import { findOpenPr, parseExportRepos, syncExportToGithub, type GithubTarget } from '../lib/github'
import { HubError } from '../lib/errors'
import { exportSet, type ExportResult, type ExportSet } from '../lib/sync'

/** Репозитории наборов из NUXT_EXPORT_REPOS: браузер их не выбирает и не подменяет. */
export function exportRepos(event: H3Event): Map<string, GithubTarget> {
  try {
    return parseExportRepos(useRuntimeConfig(event).exportRepos as string)
  } catch (error) {
    throwHubError(error)
  }
}

/** Токен GitHub для выгрузки (NUXT_GITHUB_TOKEN); пустая строка — выгрузка выключена. */
export const githubToken = (event: H3Event): string => (useRuntimeConfig(event).githubToken as string | undefined) ?? ''

/** Токен и репозиторий набора для выгрузки в GitHub; без настроек — понятная ошибка. */
export function requireExportTarget(event: H3Event, set: string): { token: string, target: GithubTarget } {
  const target = exportRepos(event).get(set)
  if (!target) {
    throw disabled('Export', `Набор «${set}» не подключён к GitHub: добавьте его в NUXT_EXPORT_REPOS`)
  }
  const token = githubToken(event)
  if (!token) {
    throw disabled('Export', 'NUXT_GITHUB_TOKEN не задан на сервере')
  }
  return { token, target }
}

/**
 * Открытый PR набора одним запросом к GitHub. Не ответил — null и запись в лог: окно выгрузки всё равно
 * узнает правду из предпросмотра, а бадж на кнопке просто не покажется.
 */
export async function openPrOrNull(token: string, target: GithubTarget, set: string) {
  try {
    return await findOpenPr({ token, target, set })
  } catch (error) {
    console.error('[export] открытый PR', set, error)
    return null
  }
}

interface SyncOptions {
  actor: string
  // Только предпросмотр: ничего не пишет
  dryRun?: boolean
  // Строка в начале описания PR — например, что выгружено без проверки в дизайн-системе
  note?: string
}

/** Файлы набора — в GitHub: сравнение с основной веткой и PR из своей ветки. Набор — именем или уже загруженный. */
export async function exportToGithub(event: H3Event, set: string | ExportSet, options: SyncOptions) {
  // Не подключён — понятная ошибка до сборки файлов
  requireExportTarget(event, typeof set === 'string' ? set : set.name)
  return syncToGithub(event, await exportSet(useDb(event), set), options)
}

/** Уже собранные файлы набора (exportSet) — в GitHub: сборку можно вести параллельно с другой работой. */
export async function syncToGithub(event: H3Event, { set, revision, files }: ExportResult, { actor, dryRun = false, note }: SyncOptions) {
  const { token, target } = requireExportTarget(event, set)
  return { revision, ...await syncExportToGithub({ token, target, set, revision, files, actor, dryRun, note }) }
}

/**
 * Сначала дизайн-система: набор с review_set (InApp, Pages Hub) выгружается, только когда общие с проверкой ключи уже
 * в её основной ветке — их проверили в Storybook и смержили. Правило и текст — те же, что у окна (reviewGate,
 * reviewGateMessage); здесь — на случай, если окно устарело или его обошли. Срочная правка — force в маршруте.
 */
export async function requireReviewed(event: H3Event, set: ExportSet) {
  if (!set.review_set) return
  if (!exportRepos(event).has(set.review_set)) {
    throw new HubError(`${reviewGateMessage(set.review_set, 'not-connected')} (NUXT_EXPORT_REPOS). Срочно — выгрузите без проверки`, 409)
  }
  // Только чтение: сравнение файлов проверки с её основной веткой
  const block = reviewGate(set, await exportToGithub(event, set.review_set, { actor: '', dryRun: true }))
  if (block) {
    throw new HubError(`${reviewGateMessage(set.review_set, block)}. Смержите её PR или выгрузите без проверки`, 409)
  }
}
