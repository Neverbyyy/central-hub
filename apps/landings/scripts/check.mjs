// Проверки лендингов в браузере: все лендинги из app/landings, как их видит человек.
//   pnpm --filter @amaya/landings check                       — после сборки: сам раздаёт .output/public, как Vercel
//   node apps/landings/scripts/check.mjs --url http://localhost:3020 [--only cars2]
// Что проверяется: кнопка ведёт в свой стор и передаёт UTM, track, FAQ, видео качается только по нажатию, порядок
// загрузки (сначала первый экран), 404, noindex, тексты на всех языках, ширина 320–1440, оглавление стенда.
// Итог: строки OK / FAIL, код выхода 1, если есть FAIL.
import { existsSync, readdirSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { launch } from '../../../tools/browser.mjs'

const APP = fileURLToPath(new URL('..', import.meta.url))
const LOCALES = join(APP, '../../packages/locales/src')
const PUBLIC = join(APP, '.output/public')

const UA = {
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  android: 'Mozilla/5.0 (Linux; Android 13; SM-A135F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36'
}
const WIDTHS = [320, 375, 390, 768, 1024, 1440]
// Живая анимация на первом экране, которая играет постоянно
const LANDINGS_WITH_ANIMATION = ['cars2-go']
const SOFTWARE_WEBGL = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.mp4': 'video/mp4',
  '.wasm': 'application/wasm'
}

const args = process.argv.slice(2)
const option = name => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined)
const only = option('--only')
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

const landings = readdirSync(join(APP, 'app/landings'), { withFileTypes: true })
  .filter(entry => entry.isDirectory() && (!only || entry.name === only))
  .map(entry => entry.name)
const languages = readdirSync(LOCALES).filter(file => file.endsWith('.json')).map(file => file.slice(0, -'.json'.length))

/** Статика сборки: путь без расширения — <путь>/index.html, как на Vercel; Range — чтобы браузер играл ролик. */
function serve(root) {
  const server = createServer(async (request, response) => {
    const path = decodeURIComponent(request.url.split('?')[0])
    const file = extname(path) ? path : join(path, 'index.html')
    try {
      const body = await readFile(join(root, file))
      const type = TYPES[extname(file)] ?? 'application/octet-stream'
      const range = /bytes=(\d+)-(\d*)/.exec(request.headers.range ?? '')
      if (range) {
        const start = Number(range[1])
        const end = range[2] ? Number(range[2]) : body.length - 1
        response.writeHead(206, { 'content-type': type, 'accept-ranges': 'bytes', 'content-range': `bytes ${start}-${end}/${body.length}` })
        response.end(body.subarray(start, end + 1))
        return
      }
      response.writeHead(200, { 'content-type': type, 'accept-ranges': 'bytes' })
      response.end(body)
    } catch {
      response.writeHead(404)
      response.end()
    }
  })
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)))
}

let base = option('--url')
let server
if (!base) {
  if (!existsSync(PUBLIC)) {
    console.error('Нет сборки: сначала pnpm --filter @amaya/landings build')
    process.exit(1)
  }
  server = await serve(PUBLIC)
  base = `http://127.0.0.1:${server.address().port}`
}

const results = []
const check = (name, ok, detail = '') => {
  results.push(ok)
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${ok || !detail ? '' : ` — ${detail}`}`)
}

const browser = await launch()

/** Страница до конца гидрации: что запрошено, куда увела кнопка, что ушло в track и что упало. */
async function open(path, { ua, width = 375, height = 812 } = {}) {
  const page = await browser.newPage()
  if (ua) await page.setUserAgent(ua)
  await page.setViewport({ width, height, isMobile: !!ua, hasTouch: !!ua })
  const requests = []
  const external = []
  const tracks = []
  const errors = []
  await page.setRequestInterception(true)
  page.on('request', (request) => {
    const url = request.url()
    requests.push(url)
    // В сторы не уходим: только запоминаем, куда вела бы кнопка
    if (/apps\.apple\.com|play\.google\.com/.test(url) && request.isNavigationRequest()) {
      external.push(url)
      request.respond({ status: 204, body: '' })
      return
    }
    request.continue()
  })
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', (message) => {
    const text = message.text()
    if (text.startsWith('[track]')) tracks.push(text)
    if ((message.type() === 'error' || /hydration/i.test(text)) && !/View Model linked|404 \(Not Found\)/.test(text)) errors.push(text)
  })
  await page.goto(`${base}${path}`, { waitUntil: 'load' })
  for (let i = 0; i < 60 && !tracks.some(line => line.includes('landing_open')); i++) await sleep(250)
  await sleep(300)
  return { page, requests, external, tracks, errors }
}

// Значок ведёт в новую вкладку: в настоящий стор не уходим, а адрес с метками проверен отдельно
async function clickBadge(page, store) {
  await page.evaluate(() => document.addEventListener('click', event => event.preventDefault()))
  await page.click(`[data-store="${store}"]`)
  await sleep(300)
}

const imagesLoaded = (page, selector) => page.$$eval(selector, images => images.length > 0 && images.every(image => image.complete && image.naturalWidth > 0))

async function checkStores(id) {
  {
    const { page, external, tracks, errors } = await open(`/${id}?utm_source=fb&utm_campaign=promo&gclid=x`, { ua: UA.iphone })
    const href = await page.$eval('[data-store="app-store"]', element => element.href)
    check(`${id}, iPhone: значок App Store с метками`, href.includes('utm_source=fb') && href.includes('ct=promo'), href)
    check(`${id}: track landing_open`, tracks.some(line => line.includes('landing_open')))
    // Кнопка на первом экране есть не у всех лендингов: без неё вход в стор — значки
    if (await page.$('[data-cta="hero"]')) {
      await page.click('[data-cta="hero"]')
      await sleep(800)
      check(`${id}, iPhone: кнопка ведёт в App Store с метками`, external.some(url => url.startsWith('https://apps.apple.com/') && url.includes('utm_campaign=promo')), external.join(' '))
      check(`${id}: track cta_click`, tracks.some(line => line.includes('cta_click')))
    } else {
      await clickBadge(page, 'app-store')
      check(`${id}: track store_click`, tracks.some(line => line.includes('store_click')))
    }
    check(`${id}, iPhone: ошибок нет`, errors.length === 0, errors.join(' | ').slice(0, 300))
    await page.close()
  }
  {
    const { page, external, tracks, errors } = await open(`/${id}/ru?utm_source=tiktok&utm_medium=cpc`, { ua: UA.android })
    const href = await page.$eval('[data-store="google-play"]', element => element.href)
    check(`${id}, Android: метки в referrer Google Play`, new URL(href).searchParams.get('referrer') === 'utm_source=tiktok&utm_medium=cpc', href)
    if (await page.$('[data-cta="features"]')) {
      await page.click('[data-cta="features"]')
      await sleep(800)
      check(`${id}, Android: кнопка ведёт в Google Play`, external.some(url => url.startsWith('https://play.google.com/') && url.includes('referrer=')), external.join(' '))
    } else {
      await clickBadge(page, 'google-play')
      check(`${id}, Android: track store_click`, tracks.some(line => line.includes('store_click')))
    }
    check(`${id}, Android: ошибок нет`, errors.length === 0, errors.join(' | ').slice(0, 300))
    await page.close()
  }
}

/** Закреплённая кнопка: на первом экране спрятана, ушёл первый экран — выехала. */
async function checkSticky(id) {
  const { page } = await open(`/${id}`, { ua: UA.android })
  if (await page.$('[data-cta="sticky"]')) {
    const hidden = () => page.$eval('[data-cta="sticky"]', element => !!element.closest('[inert]'))
    check(`${id}: закреплённая кнопка спрятана на первом экране`, await hidden())
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await sleep(600)
    check(`${id}: закреплённая кнопка выехала, когда первый экран ушёл`, !(await hidden()))
  }
  await page.close()
}

/**
 * Анимация не грузит машину: без видеокарты её нет, а не потянула — снята, и остаётся картинка первого экрана.
 * Свой браузер с программным WebGL: обычный на компьютере с видеокартой идёт через неё, и такой машины здесь не было бы.
 * Цикл кадров считается снаружи: стоит — значит, процессор свободен.
 */
async function checkAnimationLoad(id) {
  const machine = await launch({ args: SOFTWARE_WEBGL })
  const openPage = async (prepare) => {
    const page = await machine.newPage()
    await page.setViewport({ width: 1214, height: 850 })
    if (prepare) await page.evaluateOnNewDocument(prepare)
    const requests = []
    page.on('request', request => requests.push(request.url()))
    await page.goto(`${base}/${id}`, { waitUntil: 'load' })
    return { page, requests }
  }
  const framesPerSecond = async (page) => {
    await page.evaluate(() => {
      window.__frames = 0
      const original = window.requestAnimationFrame
      window.requestAnimationFrame = (callback) => {
        window.__frames++
        return original.call(window, callback)
      }
    })
    await sleep(1000)
    return page.evaluate(() => window.__frames)
  }
  const heroArt = `[id="${id}-hero"] img`

  try {
    const software = await openPage()
    await sleep(5000)
    check(`${id}, без видеокарты: рантайм Rive не загружен`, !software.requests.some(url => url.endsWith('.wasm') || url.endsWith('.riv')))
    check(`${id}, без видеокарты: холста сцены нет`, !(await software.page.$('[data-hero-rive]')))
    check(`${id}, без видеокарты: картинка на месте`, await imagesLoaded(software.page, heroArt))
    const idle = await framesPerSecond(software.page)
    check(`${id}, без видеокарты: кадры не считаются`, idle === 0, `кадров за секунду: ${idle}`)
    await software.page.close()

    // Тот же программный WebGL под именем настоящей видеокарты: проверка по имени пропустит, сработать должен замер кадров
    const { page, requests } = await openPage(() => {
      const getParameter = WebGL2RenderingContext.prototype.getParameter
      WebGL2RenderingContext.prototype.getParameter = function (name) {
        return name === 0x9246 ? 'ANGLE (Test GPU)' : getParameter.call(this, name)
      }
    })
    for (let i = 0; i < 80 && !(await page.$('[data-hero-rive]')); i++) await sleep(250)
    check(`${id}, видеокарта по имени: анимация запустилась`, !!(await page.$('[data-hero-rive]')))
    for (let i = 0; i < 80 && (await page.$('[data-hero-rive]')); i++) await sleep(250)
    check(`${id}, не тянет: рантайм загружался`, requests.some(url => url.endsWith('.wasm')))
    check(`${id}, не тянет: анимация снята`, !(await page.$('[data-hero-rive]')))
    check(`${id}, не тянет: картинка на месте`, await imagesLoaded(page, heroArt))
    const after = await framesPerSecond(page)
    check(`${id}, не тянет: кадры не считаются`, after === 0, `кадров за секунду: ${after}`)
    await page.close()
  } finally {
    await machine.close()
  }
}

async function checkDesktop(id) {
  const { page, requests, external, errors } = await open(`/${id}`, { width: 1440, height: 900 })

  if (await page.$('[data-cta="final"]')) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await sleep(400)
    await page.click('[data-cta="final"]')
    await sleep(1200)
    const stores = await page.evaluate((storesId) => {
      const box = document.getElementById(storesId).getBoundingClientRect()
      return { inView: box.top >= 0 && box.bottom <= innerHeight, focus: document.activeElement?.getAttribute('data-store') }
    }, `${id}-stores`)
    check(`${id}, компьютер: кнопка прокручивает к значкам и ставит на них фокус`, stores.inView && stores.focus === 'app-store', JSON.stringify(stores))
    check(`${id}, компьютер: в стор не уводит`, external.length === 0)
  }

  const focused = () => page.evaluate(() => [...document.querySelectorAll('[data-accordion-question]')].indexOf(document.activeElement))
  const questions = await page.$$('[data-accordion-question]')
  if (questions.length) {
    await questions[0].click()
    check(`${id}: FAQ раскрывается`, await page.$eval('[data-accordion-question]', element => element.getAttribute('aria-expanded')) === 'true')
    await page.keyboard.press('ArrowDown')
    check(`${id}: FAQ, стрелка переводит фокус`, await focused() === 1)
    await page.keyboard.press('End')
    check(`${id}: FAQ, End — последний вопрос`, await focused() === questions.length - 1)
  }

  if (await page.$('.ds-video')) {
    const isVideo = url => /\.mp4/.test(url) && !url.includes('?import')
    check(`${id}: до нажатия ролик не качается`, !requests.some(isVideo), requests.filter(isVideo).join(' '))
    await page.$eval('.ds-video', element => element.scrollIntoView({ block: 'center' }))
    await sleep(300)
    await page.click('.ds-video button')
    const played = await page.waitForFunction(() => {
      const video = document.querySelector('.ds-video video')
      return video && !video.paused && video.currentTime > 0.3
    }, { timeout: 15000 }).then(() => true, () => false)
    check(`${id}: видео играет по нажатию`, played)
    check(`${id}: ролик качается только после нажатия`, requests.some(isVideo))
    await page.evaluate(() => window.scrollTo(0, 0))
    await sleep(700)
    check(`${id}: видео ушло с экрана — пауза`, await page.evaluate(() => document.querySelector('.ds-video video').paused))
  }

  check(`${id}: всё со своего адреса`, !requests.some(url => /unpkg|jsdelivr|googleapis/.test(url)))
  check(`${id}, компьютер: ошибок нет`, errors.length === 0, errors.join(' | ').slice(0, 300))
  await page.close()
}

/** Сначала первый экран: в готовой странице нет картинок преимуществ, они приходят после его картинки — и из кеша тоже. */
async function checkLoadingOrder(id) {
  const raw = await browser.newPage()
  await raw.setJavaScriptEnabled(false)
  await raw.goto(`${base}/${id}`, { waitUntil: 'load' })
  check(`${id}: в готовой странице картинка первого экрана есть`, !!await raw.$('img[fetchpriority="high"]'))
  check(`${id}: картинок преимуществ в ней нет`, !await raw.$('[data-feature] img'))
  await raw.close()

  const page = await browser.newPage()
  await page.setViewport({ width: 375, height: 812 })
  for (const visit of ['первое открытие', 'повторное открытие']) {
    await page.goto(`${base}/${id}`, { waitUntil: 'load' })
    await sleep(800)
    // Картинки ленивые: на длинной странице браузер берёт их, только когда блок близко
    await page.$eval('[data-feature]', element => element.scrollIntoView({ block: 'center' }))
    await sleep(900)
    check(`${id}, ${visit}: картинки преимуществ загрузились`, await imagesLoaded(page, '[data-feature] img'))
  }
  check(`${id}: шрифт футера подключился`, await page.$eval('footer', element => !getComputedStyle(element).fontFamily.startsWith('Arial')))
  await page.close()
}

async function checkLanguages(id) {
  for (const path of [`/${id}/en`, `/${id}/xx`]) {
    const response = await fetch(base + path)
    check(`${path}: 404`, response.status === 404, String(response.status))
  }
  const page = await browser.newPage()
  await page.setViewport({ width: 375, height: 800 })
  for (const lang of languages) {
    const path = lang === 'en' ? `/${id}` : `/${id}/${lang}`
    await page.goto(base + path, { waitUntil: 'load' })
    await sleep(500)
    const info = await page.evaluate(() => ({
      keys: document.body.innerText.match(/\b(?:web|common|ds|app)\.[a-z0-9_]+\.[a-z0-9_.]+/g) ?? [],
      lang: document.documentElement.lang,
      robots: document.querySelector('meta[name="robots"]')?.getAttribute('content') ?? ''
    }))
    check(`${path}: тексты вместо ключей`, info.keys.length === 0, info.keys.slice(0, 3).join(', '))
    check(`${path}: lang и noindex`, info.lang === lang && /noindex/.test(info.robots), JSON.stringify(info))
  }
  await page.close()
}

async function checkWidths(id) {
  for (const width of WIDTHS) {
    const { page } = await open(`/${id}/de`, { ua: width < 700 ? UA.iphone : undefined, width, height: 800 })
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    check(`${id}, ${width} px, немецкий: без горизонтальной прокрутки`, overflow <= 0, `+${overflow}`)
    await page.close()
  }
}

async function checkIndex() {
  const robots = await (await fetch(`${base}/robots.txt`)).text()
  check('robots.txt закрывает сайт', /Disallow:\s*\//.test(robots))

  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 900 })
  await page.goto(`${base}/`, { waitUntil: 'load' })
  await sleep(800)
  const cards = await page.$$('.lp-index__card')
  check('оглавление: все лендинги', only ? cards.length > 0 : cards.length === landings.length, `карточек ${cards.length}`)
  await page.select('.lp-index__card select', 'de')
  await sleep(200)
  const href = await page.$eval('.lp-index__card .lp-index__art', element => element.getAttribute('href'))
  check('оглавление: язык меняет ссылку', href.endsWith('/de'), href)
  await page.close()
}

try {
  for (const id of landings) {
    await checkStores(id)
    await checkSticky(id)
    await checkDesktop(id)
    await checkLoadingOrder(id)
    await checkLanguages(id)
    await checkWidths(id)
    if (LANDINGS_WITH_ANIMATION.includes(id)) await checkAnimationLoad(id)
  }
  await checkIndex()
} finally {
  await browser.close()
  server?.close()
}

const fails = results.filter(ok => !ok).length
console.log(`\n${results.length - fails} OK, ${fails} FAIL`)
process.exit(fails ? 1 : 0)
