// Вебхук GitHub: о событиях PR своих веток сервис узнаёт сразу, а не при следующем открытии окна «Выгрузка в код».
// Без Nuxt-глобалов: маршрут /api/github/webhook и unit-тесты.

import { createHmac, timingSafeEqual } from 'node:crypto'
import { BRANCH_PREFIX, type GithubTarget, type PrState } from './github'

/** Подпись X-Hub-Signature-256: «sha256=» + HMAC-SHA256 тела секретом вебхука. Сравнение — за постоянное время. */
export function verifyGithubSignature(rawBody: Buffer | string, header: string | undefined, secret: string): boolean {
  if (!secret || !header?.startsWith('sha256=')) return false
  const expected = Buffer.from(`sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`)
  const actual = Buffer.from(header)
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

export interface PrEvent {
  set: string
  number: number
  state: PrState
}

interface PullRequestPayload {
  action?: string
  repository?: { full_name?: string }
  pull_request?: {
    number?: number
    merged?: boolean
    head?: { ref?: string, repo?: { full_name?: string } | null }
    base?: { ref?: string }
  }
}

const sameRepo = (a?: string, b?: string) => !!a && !!b && a.toLowerCase() === b.toLowerCase()

/**
 * Событие PR набора: PR из своей ветки amaya-hub/<набор> в репозитории этого набора (NUXT_EXPORT_REPOS)
 * открыт, переоткрыт или закрыт — смержен или нет. Всё остальное (чужие ветки, форки, другие события) — null.
 */
export function prEventForSet(eventName: string | undefined, payload: unknown, repos: Map<string, GithubTarget>): PrEvent | null {
  if (eventName !== 'pull_request') return null
  const { action, repository, pull_request: pr } = (payload ?? {}) as PullRequestPayload
  if (action !== 'opened' && action !== 'reopened' && action !== 'closed') return null
  const ref = pr?.head?.ref
  if (!pr?.number || !ref?.startsWith(BRANCH_PREFIX)) return null

  const set = ref.slice(BRANCH_PREFIX.length)
  const target = repos.get(set)
  if (!target || !sameRepo(target.repo, repository?.full_name)) return null
  // Ветка из форка с тем же именем — не наша
  if (pr.head?.repo && !sameRepo(pr.head.repo.full_name, target.repo)) return null
  if (target.branch && pr.base?.ref !== target.branch) return null

  const state: PrState = action === 'closed' ? (pr.merged ? 'merged' : 'closed') : 'open'
  return { set, number: pr.number, state }
}
