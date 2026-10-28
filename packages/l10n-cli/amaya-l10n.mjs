#!/usr/bin/env node
// amaya-l10n — тексты из сервиса локализации Amaya в проект.
//
//   pull    забрать файлы из сервиса и показать, что изменилось
//   diff    показать разницу, ничего не записывая (код выхода 1, если разница есть)
//   check   проверить, что файлы после pull никто не правил руками (код выхода 1, если правили)
//   import  занести текущие файлы проекта в сервис как есть (legacy.<проект>.)
//
// Настройки — amaya-l10n.json в корне проекта: { "hub": "https://…", "set": "inapp" }.
// Токен — переменная окружения AMAYA_L10N_TOKEN. Без зависимостей, Node.js 18+.
// CLI пишет только файлы набора; остальные файлы проекта не читает и не трогает.

import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { userInfo } from 'node:os'
import { dirname, join, resolve, sep } from 'node:path'
import { parseArgs } from 'node:util'

const CONFIG = 'amaya-l10n.json'
const LOCK = '.amaya-l10n.lock'

const USAGE = `amaya-l10n <команда> [--cwd <папка проекта>]

  pull    забрать файлы из сервиса и показать, что изменилось
  diff    показать разницу, ничего не записывая
  check   проверить, что файлы после pull не правили руками
  import  занести текущие файлы проекта в сервис как есть

Настройки: ${CONFIG} — { "hub": "https://…", "set": "inapp" }, токен: AMAYA_L10N_TOKEN`

function fail(message, code = 2) {
  console.error(`amaya-l10n: ${message}`)
  process.exit(code)
}

const sha256 = text => createHash('sha256').update(text).digest('hex')

// Сервис отдаёт LF; рабочая копия на Windows бывает с CRLF — сравниваем без учёта этого
const normalize = text => text.replace(/\r\n/g, '\n')

function plural(count, [one, few, many]) {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

function loadConfig(root) {
  const path = join(root, CONFIG)
  if (!existsSync(path)) {
    fail(`нет ${CONFIG} в ${root}. Пример: { "hub": "https://central-hub-sigma.vercel.app", "set": "inapp" }`)
  }
  let config
  try {
    config = JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    fail(`${CONFIG}: ${error.message}`)
  }
  if (typeof config.hub !== 'string' || typeof config.set !== 'string') fail(`в ${CONFIG} нужны строки hub и set`)
  return { hub: config.hub.replace(/\/+$/, ''), set: config.set }
}

async function api(config, method, path, body) {
  const token = process.env.AMAYA_L10N_TOKEN
  if (!token) fail('нужна переменная окружения AMAYA_L10N_TOKEN')

  let response
  try {
    response = await fetch(`${config.hub}${path}`, {
      method,
      headers: { 'authorization': `Bearer ${token}`, ...(body ? { 'content-type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined
    })
  } catch (error) {
    fail(`сервис ${config.hub} недоступен: ${error.cause?.message ?? error.message}`)
  }
  const text = await response.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    data = undefined
  }
  if (!response.ok) fail(`${method} ${path}: ${response.status} ${data?.message ?? text.slice(0, 200)}`)
  return data
}

const exportFiles = config => api(config, 'GET', `/api/cli/export/${encodeURIComponent(config.set)}`)

// Путь из ответа сервиса не может выйти за папку проекта
function projectPath(root, path) {
  const target = resolve(root, path)
  if (!target.startsWith(root + sep)) fail(`сервис вернул путь вне проекта: ${path}`)
  return target
}

const readIfExists = path => (existsSync(path) ? readFileSync(path, 'utf8') : null)

// Ключи файла плоским списком — для сводки «добавлено / изменено / удалено»
function flatten(text) {
  let data
  try {
    data = JSON.parse(text)
  } catch {
    return null
  }
  const keys = new Map()
  const walk = (node, prefix) => {
    for (const [key, value] of Object.entries(node)) {
      const path = prefix ? `${prefix}\u0000${key}` : key
      if (value && typeof value === 'object' && !Array.isArray(value)) walk(value, path)
      else keys.set(path, value)
    }
  }
  walk(data, '')
  return keys
}

function summarize(current, next) {
  if (current === null) return 'новый файл'
  if (normalize(current) === next) return null
  const before = flatten(current)
  const after = flatten(next)
  if (!before || !after) return 'файл изменился'

  let added = 0
  let changed = 0
  let removed = 0
  for (const [key, value] of after) {
    if (!before.has(key)) added++
    else if (before.get(key) !== value) changed++
  }
  for (const key of before.keys()) if (!after.has(key)) removed++

  const total = added + changed + removed
  if (!total) return 'изменено только форматирование'
  const parts = [added && `+${added}`, changed && `~${changed}`, removed && `−${removed}`].filter(Boolean)
  return `${parts.join(' ')} ${plural(total, ['ключ', 'ключа', 'ключей'])}`
}

async function pull(root, config, { write }) {
  const result = await exportFiles(config)
  let differs = 0

  for (const file of result.files) {
    const target = projectPath(root, file.path)
    const current = readIfExists(target)
    const summary = summarize(current, file.content)
    if (!summary) continue
    differs++
    console.log(`  ${file.path}  ${summary}`)
    if (write) {
      mkdirSync(dirname(target), { recursive: true })
      // Сохраняем стиль переводов строк, который уже был в файле
      const crlf = current !== null && current.includes('\r\n')
      writeFileSync(target, crlf ? file.content.replace(/\n/g, '\r\n') : file.content)
    }
  }

  if (write) {
    const lock = { set: config.set, revision: result.revision, files: Object.fromEntries(result.files.map(f => [f.path, f.sha256])) }
    writeFileSync(join(root, LOCK), `${JSON.stringify(lock, null, 2)}\n`)
  }

  if (!differs) console.log(`Нет изменений — файлы совпадают с сервисом (ревизия ${result.revision})`)
  else if (write) console.log(`Обновлено файлов: ${differs} (ревизия ${result.revision})`)
  else console.log(`Отличается файлов: ${differs} — amaya-l10n pull заберёт их из сервиса`)
  return differs
}

function check(root) {
  const lockPath = join(root, LOCK)
  if (!existsSync(lockPath)) fail(`нет ${LOCK} — сначала выполните amaya-l10n pull`, 1)
  const lock = JSON.parse(readFileSync(lockPath, 'utf8'))

  const edited = []
  for (const [path, hash] of Object.entries(lock.files)) {
    const current = readIfExists(projectPath(root, path))
    if (current === null) edited.push(`${path} — файла нет`)
    else if (sha256(normalize(current)) !== hash) edited.push(`${path} — изменён после pull`)
  }

  if (edited.length) {
    console.error('Файлы локалей правили в обход сервиса:')
    for (const line of edited) console.error(`  ${line}`)
    console.error('Поменяйте тексты в сервисе и выполните amaya-l10n pull')
    process.exit(1)
  }
  console.log(`Файлы совпадают с последней выгрузкой (ревизия ${lock.revision})`)
}

function gitRef(root, paths) {
  try {
    const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
    const dirty = execFileSync('git', ['status', '--porcelain', '--', ...paths], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
    return dirty ? `${head}+изменения` : head
  } catch {
    return null
  }
}

async function importProject(root, config) {
  // Какие файлы входят в набор, знает сервис
  const { files: setFiles } = await exportFiles(config)
  const files = {}
  for (const file of setFiles) {
    const current = readIfExists(projectPath(root, file.path))
    if (current === null) fail(`нет файла ${file.path}`)
    files[file.lang] = normalize(current)
  }

  const report = await api(config, 'POST', `/api/cli/import/${encodeURIComponent(config.set)}`, {
    files,
    sourceRef: gitRef(root, setFiles.map(f => f.path)),
    actor: process.env.AMAYA_L10N_ACTOR || userInfo().username
  })
  console.log(`Импорт в набор ${config.set}: строк ${report.total} — новых ${report.added}, изменено ${report.changed}, `
    + `возвращено ${report.restored}, без изменений ${report.unchanged}, помечено устаревшими ${report.deprecated}`)
}

async function main() {
  const { positionals, values } = parseArgs({ allowPositionals: true, options: { cwd: { type: 'string' }, help: { type: 'boolean', short: 'h' } } })
  const [command] = positionals
  if (values.help || !command) {
    console.log(USAGE)
    return
  }
  const root = resolve(values.cwd ?? process.cwd())

  switch (command) {
    case 'pull':
      await pull(root, loadConfig(root), { write: true })
      break
    case 'diff':
      if (await pull(root, loadConfig(root), { write: false })) process.exitCode = 1
      break
    case 'check':
      check(root)
      break
    case 'import':
      await importProject(root, loadConfig(root))
      break
    default:
      fail(`неизвестная команда «${command}»\n\n${USAGE}`)
  }
}

await main()
