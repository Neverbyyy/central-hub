import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { findOpenPr, LINES_LIMIT, parseExportRepos, syncExportToGithub } from '../../apps/central-hub/server/lib/github'
import type { ExportedFile } from '../../apps/central-hub/server/lib/sync'

const REPO = 'me/demo'
const MAIN = 'main'

const blobSha = (content: string) => {
  const bytes = Buffer.from(content, 'utf8')
  return createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex')
}

/**
 * Поддельный GitHub в памяти. Любая запись в основную ветку, мерж или удаление — сразу ошибка:
 * так тесты доказывают, что выгрузка трогает только свою ветку и свой PR.
 */
function fakeGithub(files: Record<string, string>) {
  let next = 0
  const id = () => `sha${++next}`
  const trees = new Map<string, Map<string, string>>()
  const commits = new Map<string, { tree: string, parents: string[], message: string }>()
  const refs = new Map<string, string>()
  const pulls: { number: number, head: string, base: string, state: string, title: string, body: string }[] = []
  const comments: { issue: number, body: string }[] = []
  const writes: string[] = []

  const root = id()
  trees.set(root, new Map(Object.entries(files)))
  const first = id()
  commits.set(first, { tree: root, parents: [], message: 'начальный' })
  refs.set(MAIN, first)

  const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status })
  const notFound = () => json(404, { message: 'Not Found' })
  const filesOf = (branch: string) => trees.get(commits.get(refs.get(branch)!)!.tree)!

  const fetch = async (url: string | URL | Request, init?: RequestInit) => {
    const method = init?.method ?? 'GET'
    const { pathname, searchParams } = new URL(String(url))
    expect(pathname.startsWith(`/repos/${REPO}`)).toBe(true)
    const path = decodeURIComponent(pathname.slice(`/repos/${REPO}`.length))
    const body = init?.body ? JSON.parse(String(init.body)) : undefined

    if (method !== 'GET') {
      writes.push(`${method} ${path}`)
      if (method === 'DELETE') throw new Error(`Запрещено удаление: ${path}`)
      if (path.endsWith('/merge')) throw new Error(`Запрещён мерж: ${path}`)
      if (path === `/git/refs/heads/${MAIN}` || body?.ref === `refs/heads/${MAIN}`) throw new Error('Запрещена запись в основную ветку')
    }

    if (method === 'GET' && path === '') return json(200, { default_branch: MAIN })

    let m = /^\/git\/ref\/heads\/(.+)$/.exec(path)
    if (method === 'GET' && m) return refs.has(m[1]!) ? json(200, { object: { sha: refs.get(m[1]!) } }) : notFound()

    m = /^\/git\/commits\/(.+)$/.exec(path)
    if (method === 'GET' && m) return json(200, { tree: { sha: commits.get(m[1]!)!.tree } })

    m = /^\/contents\/(.*)$/.exec(path)
    if (method === 'GET' && m) {
      const tree = filesOf(searchParams.get('ref')!)
      const target = m[1]!
      if (tree.has(target)) return new Response(tree.get(target)!, { status: 200 })
      const list = [...tree.entries()]
        .filter(([p]) => p.slice(0, p.lastIndexOf('/')) === target)
        .map(([p, content]) => ({ type: 'file', path: p, sha: blobSha(content) }))
      return list.length ? json(200, list) : notFound()
    }

    if (method === 'POST' && path === '/git/trees') {
      const tree = new Map(trees.get(body.base_tree)!)
      for (const entry of body.tree) tree.set(entry.path, entry.content)
      const sha = id()
      trees.set(sha, tree)
      return json(201, { sha })
    }

    if (method === 'POST' && path === '/git/commits') {
      const sha = id()
      commits.set(sha, { tree: body.tree, parents: body.parents, message: body.message })
      return json(201, { sha })
    }

    m = /^\/git\/refs\/heads\/(.+)$/.exec(path)
    if (method === 'PATCH' && m) {
      expect(body.force).toBe(true)
      refs.set(m[1]!, body.sha)
      return json(200, {})
    }

    if (method === 'POST' && path === '/git/refs') {
      const branch = body.ref.replace('refs/heads/', '')
      if (refs.has(branch)) return json(422, { message: 'Reference already exists' })
      refs.set(branch, body.sha)
      return json(201, {})
    }

    if (method === 'GET' && path === '/pulls') {
      const head = searchParams.get('head')!.split(':')[1]
      const base = searchParams.get('base')
      return json(200, pulls.filter(p => p.state === 'open' && p.head === head && (!base || p.base === base))
        .map(p => ({ number: p.number, html_url: `https://github.com/${REPO}/pull/${p.number}` })))
    }

    if (method === 'POST' && path === '/pulls') {
      const pr = { number: pulls.length + 1, head: body.head, base: body.base, state: 'open', title: body.title, body: body.body }
      pulls.push(pr)
      return json(201, { number: pr.number, html_url: `https://github.com/${REPO}/pull/${pr.number}` })
    }

    m = /^\/pulls\/(\d+)$/.exec(path)
    if (method === 'PATCH' && m) {
      const pr = pulls.find(p => p.number === Number(m![1]))!
      Object.assign(pr, body)
      return json(200, { number: pr.number, html_url: `https://github.com/${REPO}/pull/${pr.number}` })
    }

    m = /^\/issues\/(\d+)\/comments$/.exec(path)
    if (method === 'POST' && m) {
      comments.push({ issue: Number(m[1]), body: body.body })
      return json(201, {})
    }

    throw new Error(`Поддельный GitHub не знает ${method} ${path}`)
  }

  // Человек смержил PR на GitHub
  const merge = (number: number) => {
    const pr = pulls.find(p => p.number === number)!
    refs.set(MAIN, refs.get(pr.head)!)
    pr.state = 'closed'
  }

  return { fetch: fetch as typeof globalThis.fetch, refs, pulls, comments, writes, commits, trees, filesOf, mainAtStart: first, merge }
}

const RU = 'src/locales/ru.json'
const EN = 'src/locales/en.json'
const ORIGINAL = {
  [EN]: '{\n  "allapps_button": "DOWNLOAD"\n}\n',
  [RU]: '{\n  "allapps_button": "СКАЧАТЬ"\n}\n'
}

const exported = (files: Record<string, string>): ExportedFile[] =>
  Object.entries(files).map(([path, content]) => ({ lang: path.slice(-7, -5), path, content, sha256: '' }))

const sync = (github: ReturnType<typeof fakeGithub>, files: Record<string, string>, extra: { dryRun?: boolean, branch?: string } = {}) =>
  syncExportToGithub({
    token: 't',
    target: { repo: REPO, ...(extra.branch ? { branch: extra.branch } : {}) },
    set: 'inapp',
    revision: 'rev1',
    files: exported(files),
    actor: 'Артём',
    dryRun: extra.dryRun,
    fetch: github.fetch
  })

describe('syncExportToGithub', () => {
  it('без изменений ничего не пишет и PR не открывает', async () => {
    const github = fakeGithub(ORIGINAL)
    const result = await sync(github, ORIGINAL)
    expect(result).toMatchObject({ outcome: 'unchanged', changes: [], pr: null, base: MAIN, branch: 'amaya-hub/inapp' })
    expect(github.writes).toEqual([])
  })

  it('правка: коммит только с изменённым файлом в своей ветке и новый PR, основная ветка на месте', async () => {
    const github = fakeGithub(ORIGINAL)
    const result = await sync(github, { ...ORIGINAL, [RU]: '{\n  "allapps_button": "Скачать"\n}\n' })

    expect(result.outcome).toBe('created')
    expect(result.pr).toEqual({ number: 1, url: `https://github.com/${REPO}/pull/1` })
    expect(result.changes).toEqual([{
      path: RU, lang: 'ru', added: 0, changed: 1, removed: 0,
      lines: [{ key: 'allapps_button', before: 'СКАЧАТЬ', after: 'Скачать' }]
    }])

    const head = github.commits.get(github.refs.get('amaya-hub/inapp')!)!
    expect(head.parents).toEqual([github.mainAtStart])
    expect(head.message).toContain('ru.json ~1')
    expect(github.filesOf('amaya-hub/inapp').get(RU)).toContain('Скачать')
    expect(github.refs.get(MAIN)).toBe(github.mainAtStart)
    expect(github.pulls[0]).toMatchObject({ head: 'amaya-hub/inapp', base: MAIN, state: 'open' })
    expect(github.pulls[0]!.body).toContain('`allapps_button` (ru): «СКАЧАТЬ» → «Скачать»')
  })

  it('повторная выгрузка обновляет тот же PR, ветка пересобирается от основной', async () => {
    const github = fakeGithub(ORIGINAL)
    await sync(github, { ...ORIGINAL, [RU]: '{\n  "allapps_button": "Скачать"\n}\n' })
    const result = await sync(github, { [EN]: '{\n  "allapps_button": "Download"\n}\n', [RU]: '{\n  "allapps_button": "Скачать"\n}\n' })

    expect(result.outcome).toBe('updated')
    expect(result.pr?.number).toBe(1)
    expect(github.pulls).toHaveLength(1)
    expect(result.changes.map(c => c.path)).toEqual([EN, RU])
    expect(github.commits.get(github.refs.get('amaya-hub/inapp')!)!.parents).toEqual([github.mainAtStart])
    expect(github.refs.get(MAIN)).toBe(github.mainAtStart)
  })

  it('предпросмотр показывает изменения и открытый PR, но ничего не пишет', async () => {
    const github = fakeGithub(ORIGINAL)
    await sync(github, { ...ORIGINAL, [RU]: '{\n  "allapps_button": "Скачать"\n}\n' })
    const writes = github.writes.length

    const result = await sync(github, { ...ORIGINAL, [RU]: '{\n  "allapps_button": "Скачать!"\n}\n' }, { dryRun: true })
    expect(result.outcome).toBe('ready')
    expect(result.pr?.number).toBe(1)
    expect(result.changes[0]!.lines).toEqual([{ key: 'allapps_button', before: 'СКАЧАТЬ', after: 'Скачать!' }])
    expect(github.writes).toHaveLength(writes)
  })

  it('после мержа следующий PR содержит только новое', async () => {
    const github = fakeGithub(ORIGINAL)
    const first = { ...ORIGINAL, [RU]: '{\n  "allapps_button": "Скачать"\n}\n' }
    await sync(github, first)
    github.merge(1)

    expect((await sync(github, first)).outcome).toBe('unchanged')
    const result = await sync(github, { ...first, [EN]: '{\n  "allapps_button": "Download"\n}\n' })
    expect(result).toMatchObject({ outcome: 'created', pr: { number: 2 } })
    expect(result.changes.map(c => c.path)).toEqual([EN])
  })

  it('правку отменили до мержа — наш PR закрывается с комментарием', async () => {
    const github = fakeGithub(ORIGINAL)
    await sync(github, { ...ORIGINAL, [RU]: '{\n  "allapps_button": "Скачать"\n}\n' })

    const result = await sync(github, ORIGINAL)
    expect(result.outcome).toBe('closed')
    expect(github.pulls[0]!.state).toBe('closed')
    expect(github.comments).toEqual([{ issue: 1, body: expect.stringContaining('Выгружать нечего') }])
    expect(github.refs.get(MAIN)).toBe(github.mainAtStart)
  })

  it('файл с CRLF без правок не считается изменённым, с правкой остаётся CRLF', async () => {
    const crlf = { [EN]: ORIGINAL[EN].replace(/\n/g, '\r\n'), [RU]: ORIGINAL[RU] }
    const github = fakeGithub(crlf)
    expect((await sync(github, ORIGINAL)).outcome).toBe('unchanged')

    await sync(github, { ...ORIGINAL, [EN]: '{\n  "allapps_button": "Download"\n}\n' })
    expect(github.filesOf('amaya-hub/inapp').get(EN)).toBe('{\r\n  "allapps_button": "Download"\r\n}\r\n')
  })

  it('в результате все строки, в описании PR — первые 30', async () => {
    const file = (n: number, suffix: string) => `${JSON.stringify(Object.fromEntries(Array.from({ length: n }, (_, i) => [`key_${i}`, `Text ${i}${suffix}`])), null, 2)}\n`
    const github = fakeGithub({ [EN]: file(40, '') })
    const result = await sync(github, { [EN]: file(40, '!') })

    expect(result.changes[0]).toMatchObject({ changed: 40 })
    expect(result.changes[0]!.lines).toHaveLength(40)
    expect(result.changes[0]!.truncated).toBeUndefined()
    const body = github.pulls[0]!.body
    expect(body.match(/^- `key_/gm)).toHaveLength(30)
    expect(body).toContain('…и ещё 10')
  })

  it('больше LINES_LIMIT строк — в результате первые, у файла пометка truncated', async () => {
    const file = (n: number, suffix: string) => `${JSON.stringify(Object.fromEntries(Array.from({ length: n }, (_, i) => [`key_${i}`, `Text ${i}${suffix}`])))}\n`
    const github = fakeGithub({ [EN]: file(LINES_LIMIT + 5, '') })
    const result = await sync(github, { [EN]: file(LINES_LIMIT + 5, '!') }, { dryRun: true })

    expect(result.changes[0]).toMatchObject({ changed: LINES_LIMIT + 5, truncated: true })
    expect(result.changes[0]!.lines).toHaveLength(LINES_LIMIT)
  })

  it('файла нет в репозитории — все строки новые', async () => {
    const github = fakeGithub({ [EN]: ORIGINAL[EN] })
    const result = await sync(github, ORIGINAL)
    expect(result.changes).toEqual([expect.objectContaining({ path: RU, added: 1, changed: 0, removed: 0 })])
  })

  it('своя ветка не может совпасть с основной', async () => {
    const github = fakeGithub(ORIGINAL)
    await expect(sync(github, ORIGINAL, { branch: 'amaya-hub/inapp' })).rejects.toThrow('выгружать в неё нельзя')
    expect(github.writes).toEqual([])
  })

  it('понятные ошибки GitHub', async () => {
    const reply = (status: number) => (async () => new Response('{"message":"Bad credentials"}', { status })) as unknown as typeof fetch
    const run = (status: number) => syncExportToGithub({ token: 't', target: { repo: REPO }, set: 'inapp', revision: 'r', files: [], actor: 'a', fetch: reply(status) })
    await expect(run(401)).rejects.toThrow('GitHub не принял токен NUXT_GITHUB_TOKEN')
    await expect(run(404)).rejects.toThrow('не найден или токену он не доступен')
    await expect(run(409)).rejects.toThrow('пустой')
  })
})

describe('findOpenPr', () => {
  it('открытый PR своей ветки одним запросом, без записи', async () => {
    const github = fakeGithub(ORIGINAL)
    const find = () => findOpenPr({ token: 't', target: { repo: REPO }, set: 'inapp', fetch: github.fetch })
    expect(await find()).toBeNull()

    await sync(github, { ...ORIGINAL, [RU]: '{\n  "allapps_button": "Скачать"\n}\n' })
    const writes = github.writes.length
    expect(await find()).toEqual({ number: 1, url: `https://github.com/${REPO}/pull/1` })
    expect(github.writes).toHaveLength(writes)

    github.merge(1)
    expect(await find()).toBeNull()
  })
})

describe('parseExportRepos', () => {
  it('набор=owner/repo и необязательная ветка', () => {
    expect(parseExportRepos(' inapp=Neverbyyy/amaya-demo-inapp, pages_hub=Neverbyyy/amaya-demo-pages-hub@develop ')).toEqual(new Map([
      ['inapp', { repo: 'Neverbyyy/amaya-demo-inapp' }],
      ['pages_hub', { repo: 'Neverbyyy/amaya-demo-pages-hub', branch: 'develop' }]
    ]))
    expect(parseExportRepos('').size).toBe(0)
  })

  it('ошибка в настройке — понятное сообщение', () => {
    expect(() => parseExportRepos('inapp:Neverbyyy/x')).toThrow('нужно набор=owner/repo')
  })
})
