// Выгрузка набора в репозиторий проекта на GitHub: своя ветка amaya-hub/<set> и PR в основную ветку.
// Пишет только в свою ветку и свой PR: основную ветку не трогает, не мержит и ничего не удаляет.
// Смержить PR — решение человека. Без Nuxt-глобалов: используется маршрутами /api/export/* и тестами.

import { createHash } from 'node:crypto'
import { describeLocaleChanges, type LocaleChange } from '@amaya/l10n-core'
import { HubError } from './errors'
import type { ExportedFile } from './sync'

export const BRANCH_PREFIX = 'amaya-hub/'

export interface GithubTarget {
  // owner/name
  repo: string
  // Без ветки — основная ветка репозитория
  branch?: string
}

export interface FileChange {
  path: string
  lang: string
  added: number
  changed: number
  removed: number
  // Изменённые строки для окна изменений, не больше LINES_LIMIT
  lines: LocaleChange[]
  // Строк больше LINES_LIMIT — в lines только первые
  truncated?: true
}

export interface GithubSyncResult {
  repo: string
  base: string
  branch: string
  // unchanged — в основной ветке уже всё; ready — есть что выгрузить (предпросмотр);
  // created / updated — PR открыт или обновлён; closed — выгружать стало нечего, наш PR закрыт
  outcome: 'unchanged' | 'ready' | 'created' | 'updated' | 'closed'
  changes: FileChange[]
  pr: { number: number, url: string } | null
}

export interface GithubSyncOptions {
  token: string
  target: GithubTarget
  set: string
  revision: string
  files: ExportedFile[]
  actor: string
  // Только посмотреть, что изменится: ничего не пишет
  dryRun?: boolean
  fetch?: typeof fetch
}

const API = 'https://api.github.com'
const RAW = 'application/vnd.github.raw+json'
const LINES_IN_PR = 30
// Защита от огромного ответа предпросмотра: столько строк на файл хватает, чтобы просмотреть изменения глазами
export const LINES_LIMIT = 2000

// Так git считает sha файла: сравниваем с репозиторием, не скачивая сами файлы
const blobSha = (content: string) => {
  const bytes = Buffer.from(content, 'utf8')
  return createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex')
}

// Части пути по отдельности: слеши в ветках и папках остаются слешами
const encodePath = (path: string) => path.split('/').map(encodeURIComponent).join('/')

const dirOf = (path: string) => (path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '')

function githubError(status: number, text: string, repo: string): HubError {
  let message = text.slice(0, 200)
  try {
    message = (JSON.parse(text) as { message?: string }).message ?? message
  } catch {
    // не JSON — оставляем как есть
  }
  if (status === 401) return new HubError('GitHub не принял токен NUXT_GITHUB_TOKEN', 502)
  if (status === 403) return new HubError(`У токена нет прав на ${repo}: нужны Contents и Pull requests на запись (${message})`, 502)
  if (status === 404) return new HubError(`Репозиторий ${repo} не найден или токену он не доступен`, 502)
  if (status === 409) return new HubError(`Репозиторий ${repo} пустой — сначала положите в него файлы проекта`, 409)
  return new HubError(`GitHub ответил ${status}: ${message}`, 502)
}

function createClient(token: string, repo: string, fetchFn: typeof fetch) {
  const request = async <T>(method: string, path: string, { body, raw = false, allow404 = false }: { body?: unknown, raw?: boolean, allow404?: boolean } = {}): Promise<T | null> => {
    const response = await fetchFn(`${API}/repos/${repo}${path}`, {
      method,
      headers: {
        'authorization': `Bearer ${token}`,
        'accept': raw ? RAW : 'application/vnd.github+json',
        'x-github-api-version': '2022-11-28',
        'user-agent': 'amaya-hub',
        ...(body ? { 'content-type': 'application/json' } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    })
    if (allow404 && response.status === 404) return null
    if (!response.ok) throw githubError(response.status, await response.text(), repo)
    return (raw ? await response.text() : await response.json()) as T
  }
  return {
    get: <T>(path: string) => request<T>('GET', path) as Promise<T>,
    find: <T>(path: string) => request<T>('GET', path, { allow404: true }),
    raw: (path: string) => request<string>('GET', path, { raw: true }) as Promise<string>,
    post: <T>(path: string, body: unknown) => request<T>('POST', path, { body }) as Promise<T>,
    patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, { body }) as Promise<T>
  }
}

const quote = (value: string | null | undefined) => {
  if (value === undefined) return '—'
  if (value === null) return 'null'
  const short = value.length > 80 ? `${value.slice(0, 79)}…` : value
  return `«${short.replace(/\n/g, ' ')}»`
}

const fileName = (path: string) => path.slice(path.lastIndexOf('/') + 1)

function summary(changes: FileChange[]) {
  return changes.map((c) => {
    const parts = [c.added && `+${c.added}`, c.changed && `~${c.changed}`, c.removed && `−${c.removed}`].filter(Boolean)
    return `${fileName(c.path)} ${parts.join(' ') || 'форматирование'}`
  }).join(', ')
}

function prBody(changes: FileChange[], { actor, revision, base }: { actor: string, revision: string, base: string }) {
  const rows = changes.map(c => `| \`${c.path}\` | ${c.added} | ${c.changed} | ${c.removed} |`)
  const lines = changes.flatMap(c => c.lines.map(l => `- \`${l.key}\` (${c.lang}): ${quote(l.before)} → ${quote(l.after)}`))
    .slice(0, LINES_IN_PR)
  const hidden = changes.reduce((n, c) => n + c.added + c.changed + c.removed, 0) - lines.length
  return [
    `Тексты из сервиса локализации Amaya Hub — только утверждённые. Выгрузил: ${actor}, ревизия \`${revision}\`.`,
    '',
    '| Файл | Добавлено | Изменено | Удалено |',
    '| --- | --- | --- | --- |',
    ...rows,
    '',
    '### Что поменялось',
    ...lines,
    ...(hidden > 0 ? [`- …и ещё ${hidden}`] : []),
    '',
    `PR обновляет кнопка «Выгрузить в код» в сервисе. В \`${base}\` тексты попадут, только когда PR смержат.`
  ].join('\n')
}

interface PullRequest {
  number: number
  html_url: string
}

// Открытые PR из своей ветки; без base — в любую ветку
const openPrQuery = (repo: string, branch: string, base?: string) =>
  `/pulls?state=open&head=${encodeURIComponent(`${repo.split('/')[0]}:${branch}`)}${base ? `&base=${encodeURIComponent(base)}` : ''}`

/** Открытый PR набора одним запросом — окно сразу пишет «Обновить PR #N», не дожидаясь сравнения файлов. */
export async function findOpenPr(
  { token, target, set, fetch: fetchFn }: { token: string, target: GithubTarget, set: string, fetch?: typeof fetch }
): Promise<{ number: number, url: string } | null> {
  const gh = createClient(token, target.repo, fetchFn ?? fetch)
  const [pr] = await gh.get<PullRequest[]>(openPrQuery(target.repo, `${BRANCH_PREFIX}${set}`, target.branch))
  return pr ? { number: pr.number, url: pr.html_url } : null
}

export type PrState = 'open' | 'merged' | 'closed'

/** Состояние PR по номеру: открыт, смержен или закрыт без мержа — окно пишет «PR #7 смержен». Нет такого — null. */
export async function findPr(
  { token, target, number, fetch: fetchFn }: { token: string, target: GithubTarget, number: number, fetch?: typeof fetch }
): Promise<{ number: number, url: string, state: PrState } | null> {
  const gh = createClient(token, target.repo, fetchFn ?? fetch)
  const pr = await gh.find<PullRequest & { state: 'open' | 'closed', merged_at: string | null }>(`/pulls/${number}`)
  if (!pr) return null
  return { number: pr.number, url: pr.html_url, state: pr.state === 'open' ? 'open' : pr.merged_at ? 'merged' : 'closed' }
}

/** Сравнить файлы набора с основной веткой и открыть или обновить PR из своей ветки (без dryRun). */
export async function syncExportToGithub(options: GithubSyncOptions): Promise<GithubSyncResult> {
  const { token, target, set, files, actor, revision, dryRun = false } = options
  const repo = target.repo
  const gh = createClient(token, repo, options.fetch ?? fetch)

  const base = target.branch ?? (await gh.get<{ default_branch: string }>('')).default_branch
  const branch = `${BRANCH_PREFIX}${set}`
  // Писать можно только в свою ветку: основную не трогаем ни при каких настройках
  if (branch === base) throw new HubError(`Ветка ${branch} — основная в ${repo}, выгружать в неё нельзя`)

  const baseSha = (await gh.get<{ object: { sha: string } }>(`/git/ref/heads/${encodePath(base)}`)).object.sha
  const baseTree = (await gh.get<{ tree: { sha: string } }>(`/git/commits/${baseSha}`)).tree.sha

  // sha файлов основной ветки — списком по папкам
  const remote = new Map<string, string>()
  for (const dir of new Set(files.map(f => dirOf(f.path)))) {
    const list = await gh.find<{ type: string, path: string, sha: string }[]>(`/contents/${encodePath(dir)}?ref=${encodeURIComponent(base)}`)
    if (Array.isArray(list)) for (const item of list) if (item.type === 'file') remote.set(item.path, item.sha)
  }

  const changes: FileChange[] = []
  const tree: { path: string, mode: '100644', type: 'blob', content: string }[] = []
  for (const file of files) {
    const sha = remote.get(file.path)
    if (sha && (sha === blobSha(file.content) || sha === blobSha(file.content.replace(/\n/g, '\r\n')))) continue

    const old = sha ? await gh.raw(`/contents/${encodePath(file.path)}?ref=${encodeURIComponent(base)}`) : null
    // Файл с CRLF так и остаётся с CRLF
    const content = old?.includes('\r\n') ? file.content.replace(/\n/g, '\r\n') : file.content
    const diff = describeLocaleChanges(old === null ? null : old.replace(/\r\n/g, '\n'), file.content)
    const lines = [...diff.changed, ...diff.added, ...diff.removed]
    changes.push({
      path: file.path,
      lang: file.lang,
      added: diff.added.length,
      changed: diff.changed.length,
      removed: diff.removed.length,
      lines: lines.slice(0, LINES_LIMIT),
      ...(lines.length > LINES_LIMIT ? { truncated: true as const } : {})
    })
    tree.push({ path: file.path, mode: '100644', type: 'blob', content })
  }

  const prs = await gh.get<PullRequest[]>(openPrQuery(repo, branch, base))
  const open = prs[0] ? { number: prs[0].number, url: prs[0].html_url } : null
  const result = { repo, base, branch, changes, pr: open }

  if (dryRun) return { ...result, outcome: changes.length ? 'ready' : 'unchanged' }

  if (!changes.length) {
    if (!open) return { ...result, outcome: 'unchanged' }
    await gh.post(`/issues/${open.number}/comments`, { body: `Выгружать нечего: всё уже в \`${base}\`. Закрыл ${actor} из Amaya Hub.` })
    await gh.patch(`/pulls/${open.number}`, { state: 'closed' })
    return { ...result, outcome: 'closed' }
  }

  // Своя ветка каждый раз пересобирается от основной: после мержа в PR только новое
  const created = await gh.post<{ sha: string }>('/git/trees', { base_tree: baseTree, tree })
  const commit = await gh.post<{ sha: string }>('/git/commits', {
    message: `Тексты из Amaya Hub: ${summary(changes)}\n\nВыгрузил: ${actor}, ревизия ${revision}`,
    tree: created.sha,
    parents: [baseSha]
  })
  const ref = `heads/${encodePath(branch)}`
  if (await gh.find(`/git/ref/${ref}`)) await gh.patch(`/git/refs/${ref}`, { sha: commit.sha, force: true })
  else await gh.post('/git/refs', { ref: `refs/heads/${branch}`, sha: commit.sha })

  const title = `Тексты из Amaya Hub — ${set}`
  const body = prBody(changes, { actor, revision, base })
  const pr = open
    ? await gh.patch<PullRequest>(`/pulls/${open.number}`, { title, body })
    : await gh.post<PullRequest>('/pulls', { title, head: branch, base, body })

  return { ...result, outcome: open ? 'updated' : 'created', pr: { number: pr.number, url: pr.html_url } }
}

/** NUXT_EXPORT_REPOS: inapp=owner/name,pages_hub=owner/name@ветка — репозитории наборов. */
export function parseExportRepos(value: string): Map<string, GithubTarget> {
  const targets = new Map<string, GithubTarget>()
  for (const part of value.split(',').map(p => p.trim()).filter(Boolean)) {
    const match = /^([a-z0-9_]+)=([\w.-]+\/[\w.-]+)(?:@(.+))?$/i.exec(part)
    if (!match) throw new HubError(`NUXT_EXPORT_REPOS: не понял «${part}», нужно набор=owner/repo[@ветка]`, 500)
    targets.set(match[1]!, { repo: match[2]!, ...(match[3] ? { branch: match[3] } : {}) })
  }
  return targets
}
