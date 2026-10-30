import type { H3Event } from 'h3'
import { parseExportRepos, type GithubTarget } from '../lib/github'

/** Репозитории наборов из NUXT_EXPORT_REPOS: браузер их не выбирает и не подменяет. */
export function exportRepos(event: H3Event): Map<string, GithubTarget> {
  try {
    return parseExportRepos(useRuntimeConfig(event).exportRepos as string)
  } catch (error) {
    throwHubError(error)
  }
}

/** Токен и репозиторий набора для выгрузки в GitHub; без настроек — понятная ошибка. */
export function requireExportTarget(event: H3Event, set: string): { token: string, target: GithubTarget } {
  const target = exportRepos(event).get(set)
  if (!target) {
    throw createError({ statusCode: 503, statusMessage: 'Export Disabled', message: `Набор «${set}» не подключён к GitHub: добавьте его в NUXT_EXPORT_REPOS` })
  }
  const token = useRuntimeConfig(event).githubToken as string
  if (!token) {
    throw createError({ statusCode: 503, statusMessage: 'Export Disabled', message: 'NUXT_GITHUB_TOKEN не задан на сервере' })
  }
  return { token, target }
}
