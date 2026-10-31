import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { prEventForSet, verifyGithubSignature } from '../../apps/central-hub/server/lib/github-webhook'
import { parseExportRepos } from '../../apps/central-hub/server/lib/github'

const SECRET = 'webhook-secret'
const sign = (body: string, secret = SECRET) => `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`

const repos = parseExportRepos('inapp=Neverbyyy/amaya-demo-inapp,pages_hub=Neverbyyy/amaya-demo-pages-hub@develop')

// Тело события pull_request так, как его присылает GitHub, — только нужные поля
const prPayload = ({ action = 'closed', merged = true, repo = 'Neverbyyy/amaya-demo-inapp', ref = 'amaya-hub/inapp', headRepo = repo, base = 'main', number = 7 } = {}) => ({
  action,
  number,
  repository: { full_name: repo },
  pull_request: { number, merged, head: { ref, repo: { full_name: headRepo } }, base: { ref: base } }
})

describe('подпись вебхука GitHub', () => {
  const body = JSON.stringify(prPayload())

  it('верная подпись — да; чужой секрет, правка тела, пусто — нет', () => {
    expect(verifyGithubSignature(body, sign(body), SECRET)).toBe(true)
    expect(verifyGithubSignature(Buffer.from(body), sign(body), SECRET)).toBe(true)
    expect(verifyGithubSignature(body, sign(body, 'другой'), SECRET)).toBe(false)
    expect(verifyGithubSignature(`${body} `, sign(body), SECRET)).toBe(false)
    expect(verifyGithubSignature(body, undefined, SECRET)).toBe(false)
    expect(verifyGithubSignature(body, 'sha1=abc', SECRET)).toBe(false)
    // Секрет на сервере не задан — не пропускаем ничего
    expect(verifyGithubSignature(body, sign(body, ''), '')).toBe(false)
  })
})

describe('событие PR набора', () => {
  it('смержен, закрыт без мержа, открыт и переоткрыт — событие своего набора', () => {
    expect(prEventForSet('pull_request', prPayload(), repos)).toEqual({ set: 'inapp', number: 7, state: 'merged' })
    expect(prEventForSet('pull_request', prPayload({ merged: false }), repos)).toEqual({ set: 'inapp', number: 7, state: 'closed' })
    expect(prEventForSet('pull_request', prPayload({ action: 'opened', merged: false }), repos)).toMatchObject({ state: 'open' })
    expect(prEventForSet('pull_request', prPayload({ action: 'reopened', merged: false }), repos)).toMatchObject({ state: 'open' })
    // Имя репозитория в другом регистре — тот же репозиторий
    expect(prEventForSet('pull_request', prPayload({ repo: 'neverbyyy/Amaya-Demo-Inapp' }), repos)).toMatchObject({ set: 'inapp' })
  })

  it('набор с веткой в NUXT_EXPORT_REPOS — только PR в неё', () => {
    const pagesHub = { repo: 'Neverbyyy/amaya-demo-pages-hub', ref: 'amaya-hub/pages_hub' }
    expect(prEventForSet('pull_request', prPayload({ ...pagesHub, base: 'develop' }), repos)).toMatchObject({ set: 'pages_hub' })
    expect(prEventForSet('pull_request', prPayload({ ...pagesHub, base: 'main' }), repos)).toBeNull()
  })

  it('чужое — null: другие события и действия, чужая ветка, не тот репозиторий, форк, неизвестный набор', () => {
    expect(prEventForSet('push', prPayload(), repos)).toBeNull()
    expect(prEventForSet('ping', {}, repos)).toBeNull()
    expect(prEventForSet('pull_request', prPayload({ action: 'synchronize' }), repos)).toBeNull()
    expect(prEventForSet('pull_request', prPayload({ ref: 'feature/texts' }), repos)).toBeNull()
    expect(prEventForSet('pull_request', prPayload({ repo: 'Neverbyyy/amaya-demo-pages-hub' }), repos)).toBeNull()
    expect(prEventForSet('pull_request', prPayload({ headRepo: 'stranger/amaya-demo-inapp' }), repos)).toBeNull()
    expect(prEventForSet('pull_request', prPayload({ ref: 'amaya-hub/unknown' }), repos)).toBeNull()
    expect(prEventForSet('pull_request', null, repos)).toBeNull()
  })
})
