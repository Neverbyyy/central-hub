// Лендинги дизайн-системы внутри чужого приложения (Pages Hub, amaya: { embedded: true }) — после переноса, на своей
// копии проекта, собранной и запущенной (node .output/server/index.mjs). Рабочий проект не трогаем.
//   node packages/nuxt/scripts/check-host.mjs --app http://[::1]:3101 --landing l16.amayasoft.uz --landing l17.amayasoft.uz
//        [--langs en,ru] [--base http://[::1]:3102 --existing l1.amayasoft.uz/,l15.amayasoft.uz/,amayakids.com/en]
// --base — та же копия без наших правок, собранная и запущенная рядом: у её страниц (--existing) сравниваются стили
// и prefetch тяжёлых файлов — наши правки не должны их менять.
// Внешняя сеть закрыта: страницы хоста шлют события в боевую аналитику (пиксель Meta работает и в dev), поэтому
// браузер видит только хосты, направленные на копию. Итог: строки OK / FAIL, код выхода 1, если есть FAIL.
import { request } from 'node:http'
import { launch } from '../../../tools/browser.mjs'

const args = process.argv.slice(2)
const all = name => args.flatMap((arg, index) => (arg === name ? [args[index + 1]] : []))
const option = name => all(name)[0]
const app = new URL(option('--app') ?? 'http://[::1]:3101')
const base = option('--base') ? new URL(option('--base')) : null
const landings = all('--landing')
const langs = (option('--langs') ?? 'en,ru').split(',')
const existing = (option('--existing') ?? '').split(',').filter(Boolean)
if (!landings.length) throw new Error('нужен хотя бы один --landing <хост лендинга>')

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
let failed = 0
let passed = 0
const check = (name, ok, detail = '') => {
  if (ok) passed += 1
  else failed += 1
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${!ok && detail ? ` — ${String(detail).slice(0, 220)}` : ''}`)
}

const UA = {
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  android: 'Mozilla/5.0 (Linux; Android 13; SM-A135F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36'
}
const hosts = [...new Set([...landings, ...existing.map(page => page.split('/')[0])])]
// Все хосты — на копию, остальное не резолвится
const RULES = `--host-resolver-rules=${hosts.map(host => `MAP ${host} ${app.hostname}`).join(', ')}, MAP * ~NOTFOUND`

// fetch в Node подменяет заголовок Host, поэтому — node:http
function get(server, host, path) {
  return new Promise((resolve, reject) => {
    const req = request({ host: server.hostname.replace(/^\[|\]$/g, ''), port: server.port, path, headers: { Host: host } }, (res) => {
      let text = ''
      res.setEncoding('utf8')
      res.on('data', (chunk) => {
        text += chunk
      })
      res.on('end', () => resolve({ status: res.statusCode, location: res.headers.location, text }))
    })
    req.on('error', reject)
    req.end()
  })
}

const browser = await launch({ args: [RULES] })

async function open(host, path, { ua, width = 390, height = 844 } = {}) {
  const page = await browser.newPage()
  await page.setViewport({ width, height })
  if (ua) await page.setUserAgent(ua)
  const requests = []
  const events = []
  const errors = []
  const stores = []
  await page.setRequestInterception(true)
  page.on('request', (req) => {
    const url = req.url()
    requests.push({ url, type: req.resourceType() })
    // События лендинга уходят на роут самого приложения: { event, … }
    if (req.method() === 'POST' && url.startsWith(`http://${host}`)) {
      try {
        const body = JSON.parse(req.postData() ?? '{}')
        if (typeof body.event === 'string') events.push(body.event)
      } catch {
        // не JSON — не событие
      }
    }
    if (/apps\.apple\.com|play\.google\.com/.test(url) && req.isNavigationRequest()) {
      stores.push(url)
      req.respond({ status: 204, body: '' })
      return
    }
    req.continue()
  })
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', (message) => {
    const text = message.text()
    if ((message.type() === 'error' || /hydration/i.test(text)) && !/ERR_NAME_NOT_RESOLVED|View Model linked/.test(text)) errors.push(text)
  })
  await page.goto(`http://${host}:${app.port}${path}`, { waitUntil: 'load', timeout: 60000 })
  await sleep(1200)
  return { page, requests, events, errors, stores }
}

const preventNavigation = page => page.evaluate(() => document.addEventListener('click', event => event.preventDefault()))

try {
  for (const host of landings) {
    // Ответ сервера
    for (const lang of langs) {
      const { status, text } = await get(app, host, `/${lang}`)
      check(`${host}/${lang}: ответ 200`, status === 200, status)
      check(`${host}/${lang}: lang="${lang}"`, new RegExp(`<html[^>]*lang="${lang}"`).test(text))
      check(`${host}/${lang}: noindex`, /name="robots"[^>]*noindex/.test(text))
      check(`${host}/${lang}: корень дизайн-системы в HTML`, text.includes('data-ds-root'))
      check(`${host}/${lang}: картинка первого экрана с fetchpriority`, text.includes('fetchpriority="high"'))
      check(`${host}/${lang}: в HTML нет prefetch wasm и .riv`, !/rel="prefetch"[^>]*\.(?:wasm|riv)"/.test(text))
      check(`${host}/${lang}: тексты, а не ключи`, !/>\s*(?:web|common|ds)\.[a-z0-9_.]+\s*</.test(text), text.match(/>\s*(?:web|common|ds)\.[a-z0-9_.]+\s*</)?.[0])
    }

    // iPhone: App Store с метками, события
    {
      const { page, events, errors, stores } = await open(host, `/${langs[0]}?utm_source=fb&utm_campaign=promo`, { ua: UA.iphone })
      const href = await page.$eval('[data-store="app-store"]', element => element.href).catch(() => '')
      check(`${host}, iPhone: значок App Store с метками`, href.includes('utm_source=fb'), href)
      check(`${host}: событие открытия ушло на роут приложения`, events.length > 0, 'событий нет — setTrackHandler не подключён или две копии landing-kit')
      if (await page.$('[data-cta="hero"]')) {
        await page.click('[data-cta="hero"]')
        await sleep(800)
        check(`${host}, iPhone: кнопка ведёт в App Store`, stores.some(url => url.startsWith('https://apps.apple.com/')), stores.join(' '))
      }
      const before = events.length
      await preventNavigation(page)
      await page.click('[data-store="app-store"]')
      await sleep(500)
      check(`${host}: нажатие на значок стора — событие`, events.length > before, events.join(','))
      check(`${host}, iPhone: ошибок нет`, errors.length === 0, errors.join(' | '))
      await page.close()
    }

    // Android: Google Play и метки в referrer
    {
      const { page, errors } = await open(host, `/${langs[langs.length - 1]}?utm_source=tiktok&utm_medium=cpc`, { ua: UA.android })
      const href = await page.$eval('[data-store="google-play"]', element => element.href).catch(() => '')
      check(`${host}, Android: метки в referrer Google Play`, href && new URL(href).searchParams.get('referrer') === 'utm_source=tiktok&utm_medium=cpc', href)
      check(`${host}, Android: ошибок нет`, errors.length === 0, errors.join(' | '))
      await page.close()
    }

    // Компьютер: FAQ, видео, шрифт, своё — со своего адреса
    {
      const { page, requests, errors } = await open(host, `/${langs[0]}`, { width: 1440, height: 900 })
      const question = await page.$('[data-accordion-question]')
      if (question) {
        await question.evaluate(element => element.scrollIntoView({ block: 'center' }))
        await question.click()
        await sleep(200)
        check(`${host}: FAQ раскрывается`, await question.evaluate(element => element.getAttribute('aria-expanded')) === 'true')
      }
      if (await page.$('.ds-video')) {
        // Ролик может прийти заранее через prefetch самого приложения (общий с ним файл) — считаем только запросы плеера
        check(`${host}: до нажатия плеер ролик не качает`, !requests.some(item => item.type === 'media'), requests.filter(item => item.type === 'media').map(item => item.url).join(' '))
        await page.$eval('.ds-video', element => element.scrollIntoView({ block: 'center' }))
        await sleep(300)
        await page.click('.ds-video button')
        const played = await page.waitForFunction(() => {
          const video = document.querySelector('.ds-video video')
          return video && !video.paused && video.currentTime > 0.3
        }, { timeout: 15000 }).then(() => true, () => false)
        check(`${host}: видео играет по нажатию`, played)
      }
      check(`${host}: шрифт дизайн-системы загружен`, await page.evaluate(() => document.fonts.check('16px "Nunito Variable"')))
      check(`${host}: ничего с CDN`, !requests.some(item => /unpkg|jsdelivr|googleapis/.test(item.url)))
      check(`${host}, компьютер: ошибок нет`, errors.length === 0, errors.join(' | '))
      await page.close()
    }

    // Rive: если на странице есть анимация — wasm со своего адреса
    {
      const { page, requests } = await open(host, `/${langs[0]}`)
      const started = await page.waitForFunction(() => document.querySelector('.ds-rive canvas'), { timeout: 12000 }).then(() => true, () => false)
      if (started) {
        // Холст появляется раньше, чем рантайм просит wasm
        const isWasm = item => item.url.endsWith('.wasm')
        for (let i = 0; i < 40 && !requests.some(isWasm); i++) await sleep(250)
        check(`${host}: wasm Rive со своего адреса`, requests.some(item => isWasm(item) && item.url.startsWith(`http://${host}`)), requests.filter(isWasm).map(item => item.url).join(' ') || 'wasm не запрашивался')
      }
      await page.close()
    }
  }

  // Старые страницы хоста не изменились: стили и prefetch тяжёлых файлов как у копии без наших правок.
  // Файл сравнивается по хешу содержимого: Vite мог склеить наш файл с таким же файлом хоста под другим именем
  if (base) {
    const heavy = html => [...html.matchAll(/<link rel="(prefetch|preload)"[^>]*href="([^"]+)"/g)]
      .filter(([, , href]) => /\.(?:mp4|wasm|riv|woff2|webp|png|jpe?g|svg)$/.test(href))
      .map(([, rel, href]) => `${rel}:${href.split('/').pop().replace(/^.*?\.([\w-]{8})\.(\w+)$/, '$1.$2')}`)
      .sort()
    // Стили — по содержимому, без учёта порядка правил: @nuxt/fonts от сборки к сборке пишет те же @font-face
    // в другом порядке, и имя файла меняется, хотя страница рисуется так же
    const styles = async (server, host, html) => {
      const hrefs = [...html.matchAll(/<link rel="stylesheet"[^>]*href="([^"]+)"/g)].map(match => match[1])
      const texts = await Promise.all(hrefs.map(href => get(server, host, href).then(res => res.text)))
      const inline = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(match => match[1])
      return [...texts, ...inline].join('').split('}').map(rule => rule.trim()).filter(Boolean).sort()
    }
    for (const item of existing) {
      const [host, ...rest] = item.split('/')
      const path = `/${rest.join('/')}`
      const [now, was] = await Promise.all([get(app, host, path), get(base, host, path)])
      check(`${host}${path}: ответ как у базы (${was.status})`, now.status === was.status, now.status)
      const added = heavy(now.text).filter(link => !heavy(was.text).includes(link))
      const gone = heavy(was.text).filter(link => !heavy(now.text).includes(link))
      check(`${host}${path}: prefetch и preload тяжёлых файлов как у базы`, !added.length && !gone.length, `новые: ${added.join(', ')}; пропали: ${gone.join(', ')}`)
      const [stylesNow, stylesWas] = await Promise.all([styles(app, host, now.text), styles(base, host, was.text)])
      const extra = stylesNow.filter(rule => !stylesWas.includes(rule))
      const lost = stylesWas.filter(rule => !stylesNow.includes(rule))
      check(`${host}${path}: стили как у базы (${stylesWas.length} правил)`, !extra.length && !lost.length, `новые: ${extra.slice(0, 2).join(' | ').slice(0, 120)}; пропали: ${lost.slice(0, 2).join(' | ').slice(0, 120)}`)
    }
  }
} finally {
  await browser.close()
}

// Без видеокарты анимация не грузится
{
  const soft = await launch({ args: [RULES, '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
  try {
    for (const host of landings) {
      const page = await soft.newPage()
      const requests = []
      page.on('request', req => requests.push(req.url()))
      await page.setViewport({ width: 1214, height: 850 })
      await page.goto(`http://${host}:${app.port}/${langs[0]}`, { waitUntil: 'load', timeout: 60000 })
      await sleep(5500)
      check(`${host}, без видеокарты: рантайм Rive не загружен`, !requests.some(url => url.endsWith('.wasm')))
      await page.close()
    }
  } finally {
    await soft.close()
  }
}

console.log(`${passed} OK, ${failed} FAIL`)
process.exitCode = failed ? 1 : 0
