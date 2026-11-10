import type { H3Event } from 'h3'
import { findOpenPr, parseExportRepos, syncExportToGithub, type GithubTarget } from '../lib/github'
import { exportSet } from '../lib/sync'

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
export async function exportToGithub(event: H3Event, set: string, { actor, dryRun = false }: { actor: string, dryRun?: boolean }) {
  const { token, target } = requireExportTarget(event, set)
  const { revision, files } = await exportSet(useDb(event), set)
  return { revision, ...await syncExportToGithub({ token, target, set, revision, files, actor, dryRun }) }
}
