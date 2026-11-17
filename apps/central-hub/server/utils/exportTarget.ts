import type { H3Event } from 'h3'
import { findOpenPr, parseExportRepos, syncExportToGithub, type GithubTarget } from '../lib/github'
import { HubError } from '../lib/errors'
import { exportSet, type ExportSet } from '../lib/sync'

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

/** Файлы набора — в GitHub: сравнение с основной веткой и PR из своей ветки; dryRun — только предпросмотр. */
export async function exportToGithub(
  event: H3Event,
  set: string,
  { actor, dryRun = false, note }: { actor: string, dryRun?: boolean, note?: string }
) {
  const { token, target } = requireExportTarget(event, set)
  const { revision, files } = await exportSet(useDb(event), set)
  return { revision, ...await syncExportToGithub({ token, target, set, revision, files, actor, dryRun, note }) }
}

/**
 * Сначала дизайн-система: набор с review_set (InApp, Pages Hub) выгружается, только когда общие с проверкой ключи уже
 * в её основной ветке — их проверили в Storybook и смержили. Правило то же, что у окна (reviewGate); здесь — на случай,
 * если окно устарело или его обошли. Срочная правка — force в маршруте, мимо этой проверки.
 */
export async function requireReviewed(event: H3Event, set: ExportSet, actor: string) {
  if (!set.review_set) return
  const review = exportProjectName(set.review_set)
  if (!exportRepos(event).has(set.review_set)) {
    throw new HubError(`Сначала — «${review}», но она не подключена к GitHub (NUXT_EXPORT_REPOS): проверить нечем. Срочно — выгрузите без проверки`, 409)
  }
  // Только чтение: сравнение файлов проверки с её основной веткой
  const preview = await exportToGithub(event, set.review_set, { actor, dryRun: true })
  const block = reviewGate(set, preview)
  if (block) {
    throw new HubError(`Сначала — «${review}»: ${reviewBlockText(block)} ещё не в её основной ветке. Смержите её PR или выгрузите без проверки`, 409)
  }
}
