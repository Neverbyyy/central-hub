// Сценарии пейволлов и онбординга из ТЗ — в эмуляторе InApp, по настоящему протоколу (экран в iframe).
//   pnpm --filter @amaya/inapp-preview scenarios                — сам поднимает vite на свободном порту
//   node apps/inapp-preview/scripts/scenarios.mjs --url http://localhost:6011 [--only cars2]
// Эмулятором управляет window.__inapp (src/emulator/InAppEmulator.vue): open, close, pay(итог), log, state, screen.
// Итог: строки OK / FAIL / WARN, код выхода 1, если есть FAIL. WARN — зоны iPhone Duo: в InApp элементы из них
// уводит его адаптер (useIphoneDuoControls), эмулятор показывает вёрстку до адаптации.
import { fileURLToPath } from 'node:url'
import { launch } from '../../../tools/browser.mjs'

const args = process.argv.slice(2)
const option = name => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined)
const only = option('--only')
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

let base = option('--url')
let server
if (!base) {
  const { createServer } = await import('vite')
  server = await createServer({ root: fileURLToPath(new URL('..', import.meta.url)), server: { port: 6031, strictPort: false }, logLevel: 'error' })
  await server.listen()
  base = server.resolvedUrls.local[0].replace(/\/$/, '')
}

const results = []
const report = (level, name, detail = '') => {
  results.push(level)
  console.log(`${level.padEnd(4)} ${name}${detail ? ` — ${detail}` : ''}`)
}
const check = (name, ok, detail) => report(ok ? 'OK' : 'FAIL', name, ok ? '' : detail)

// Экраны: что на них заблокировано во время покупки и как поменять выбор (для проверки «как новый»)
const SCREENS = [
  {
    key: 'cars2',
    title: 'Cars 2',
    id: 'ios_as_cars2_ds1_varb_t1_pw_slider_v1',
    locked: '[data-unlock] .ds-button',
    // Попап «More plans» — после повторного открытия его быть не должно
    change: async frame => frame.evaluate(() => document.querySelector('[data-pw="more"]')?.click()),
    changed: frame => frame.evaluate(() => !!document.querySelector('[role="dialog"]'))
  },
  {
    key: 'farm-start',
    title: 'Farm On start',
    id: 'ios_as_farm_ds1_varb_ut1_pw_switch_v1',
    locked: '[role="radio"], [role="switch"]',
    change: async frame => frame.evaluate(() => document.querySelectorAll('[role="radio"]')[1]?.click()),
    changed: frame => frame.evaluate(() => document.querySelectorAll('[role="radio"]')[1]?.getAttribute('aria-checked') === 'true')
  },
  {
    key: 'farm-click',
    title: 'Farm On click',
    id: 'ios_as_farm_ds1_varb_ut1_pw_trio_v1',
    locked: '[role="radio"]',
    change: async frame => frame.evaluate(() => document.querySelectorAll('[role="radio"]')[2]?.click()),
    changed: frame => frame.evaluate(() => document.querySelectorAll('[role="radio"]')[2]?.getAttribute('aria-checked') === 'true')
  }
].filter(screen => !only || screen.key === only)

const browser = await launch()
const errors = []

async function emulator(query, viewport = { width: 1400, height: 800 }) {
  const page = await browser.newPage()
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => message.type() === 'error' && !/favicon/.test(message.text()) && errors.push(message.text()))
  await page.setViewport(viewport)
  await page.goto(`${base}/?${new URLSearchParams({ outcome: 'ask', ...query })}`, { waitUntil: 'load' })
  await page.waitForFunction(() => window.__inapp && ['open', 'closed'].includes(window.__inapp.state.phase), { timeout: 20000 })
  await sleep(400)
  const frame = await (await page.$('iframe')).contentFrame()
  return { page, frame }
}
const inapp = (page, call) => page.evaluate(call)
const log = page => inapp(page, () => window.__inapp.log.map(item => ({ dir: item.dir, text: item.text, problem: item.problem, note: item.note })))
const count = (lines, name) => lines.filter(line => line.dir === 'in' && line.text.split(' ')[0] === name).length
const problems = lines => lines.filter(line => line.problem).map(line => `${line.text}: ${line.problem}`)
const state = page => inapp(page, () => window.__inapp.state)
const tapCta = async (frame) => {
  const cta = await frame.$('[data-pw="cta"]')
  await cta.click()
}

try {
  for (const screen of SCREENS) {
    const name = screen.title
    // 1. Первое открытие
    let { page, frame } = await emulator({ screen: screen.id, device: 'iphone' })
    let lines = await log(page)
    const opened = await state(page)
    check(`${name}: «готов» один раз, экран открыт`, count(lines, 'ready') === 1 && opened.phase === 'open', JSON.stringify(opened))
    check(`${name}: «готов» быстрее 3 с (арт, шрифт, цены)`, opened.readyIn !== null && opened.readyIn < 3000, `${opened.readyIn} мс`)
    if (await frame.$('[role="radio"]')) {
      check(`${name}: тариф выбран при открытии`, await frame.$('[role="radio"][aria-checked="true"]') !== null)
    }
    check(`${name}: крестик сразу не виден`, await frame.$('[data-pw="close"][data-shown]') === null)
    await sleep(3200)
    check(`${name}: крестик появился с задержкой`, await frame.$('[data-pw="close"][data-shown]') !== null)

    // 2. Покупка: двойной тап — одна покупка, загрузка, остальное заблокировано; отмена и ошибка — снова выбор
    await tapCta(frame)
    await sleep(40)
    await tapCta(frame)
    await sleep(200)
    lines = await log(page)
    check(`${name}: двойной тап — одна покупка`, count(lines, 'buy') === 1 && problems(lines).length === 0, problems(lines).join(' | ') || `buy: ${count(lines, 'buy')}`)
    check(`${name}: кнопка показывает загрузку`, await frame.$('[data-pw="cta"][aria-busy="true"]') !== null)
    const unlocked = await frame.$$eval(screen.locked, els => els.filter(el => !(el.disabled || el.getAttribute('aria-disabled') === 'true' || el.closest('[aria-disabled="true"]'))).length)
    check(`${name}: во время покупки остальное заблокировано`, unlocked === 0, `не заблокировано: ${unlocked}`)
    for (const result of ['cancel', 'error']) {
      await inapp(page, r => window.__inapp.pay(r), result)
      // Повторное нажатие — не раньше защиты от двойного тапа (800 мс, как useClickCooldown в InApp): человек после окна стора нажимает позже
      await sleep(900)
      const busy = await frame.$('[data-pw="cta"][aria-busy="true"]')
      await tapCta(frame)
      await sleep(200)
      lines = await log(page)
      check(`${name}: ${result === 'cancel' ? 'отмена' : 'ошибка'} — снова выбор и можно купить`, busy === null && (await state(page)).phase === 'open' && (await state(page)).purchasing !== null, JSON.stringify(await state(page)))
    }
    await inapp(page, () => window.__inapp.pay('success'))
    await sleep(500)
    lines = await log(page)
    check(`${name}: успех закрывает экран`, count(lines, 'close') === 1 && (await state(page)).phase === 'closed', lines.slice(-3).map(l => l.text).join(' | '))

    // 3. Повторное открытие — экран как новый, «готов» не дублируется, ничего не задвоилось
    await inapp(page, () => window.__inapp.open())
    await sleep(500)
    await screen.change(frame)
    await sleep(400)
    const didChange = await screen.changed(frame)
    await inapp(page, () => window.__inapp.close())
    await sleep(300)
    await inapp(page, () => window.__inapp.open())
    await sleep(600)
    lines = await log(page)
    check(`${name}: повторное открытие — как новый`, didChange && !(await screen.changed(frame)), didChange ? 'выбор не сбросился' : 'выбор не поменялся — проверка не сработала')
    check(`${name}: повтор без лишних «готов» и дублей`, count(lines, 'ready') === 1 && problems(lines).length === 0, problems(lines).join(' | ') || `ready: ${count(lines, 'ready')}`)
    await page.close()

    // 4. Пресеты: нет продукта — экран не показывается; триал был; евро
    ;({ page } = await emulator({ screen: screen.id, preset: 'noProduct' }))
    lines = await log(page)
    check(`${name}, нет продукта: закрыт без «готов»`, count(lines, 'ready') === 0 && count(lines, 'close') === 1 && (await state(page)).phase === 'closed', lines.map(l => l.text).join(' | '))
    await page.close()
    for (const preset of ['wasTrial', 'euro']) {
      ;({ page } = await emulator({ screen: screen.id, preset }))
      lines = await log(page)
      const current = await state(page)
      check(`${name}, ${preset}: открыт без ошибок`, current.phase === 'open' && problems(lines).length === 0, JSON.stringify(current))
      await page.close()
    }

    // 5. Размеры и немецкий: главная кнопка, тарифы, заголовок, документы и крестик — целиком на экране
    for (const device of ['se', 'iphone8', 'iphone', 'promax', 'ipad', 'tall', 'duo-folded-l', 'duo-folded-r', 'duo-unfolded']) {
      ;({ page, frame } = await emulator({ screen: screen.id, device, lang: 'de' }))
      await sleep(3300)
      const geometry = await inapp(page, () => window.__inapp.screen)
      const boxes = await frame.$$eval('[data-pw="cta"], [data-pw="close"], [role="radio"], [role="switch"], h1, [data-legal]', els => els.map((el) => {
        const r = el.getBoundingClientRect()
        return { name: (el.getAttribute('data-pw') ?? el.getAttribute('data-legal') ?? el.getAttribute('role') ?? el.tagName).toLowerCase(), x: r.left, y: r.top, w: r.width, h: r.height }
      }).filter(box => box.w > 0))
      const outside = boxes.filter(box => box.x < -1 || box.y < -1 || box.x + box.w > geometry.width + 1 || box.y + box.h > geometry.height + 1).map(box => box.name)
      check(`${name} ${device} (${geometry.width}×${geometry.height}), немецкий: всё на экране`, outside.length === 0, outside.join(', '))
      if (geometry.duo) {
        const zones = [geometry.duo.island, geometry.duo.camera].filter(Boolean)
        const hit = boxes.filter(box => zones.some(([x, y, w, h]) => box.x < x + w && box.x + box.w > x && box.y < y + h && box.y + box.h > y)).map(box => box.name)
        if (hit.length) report('WARN', `${name} ${device}: под Island или камерой`, `${hit.join(', ')} — в InApp сдвинет адаптер Duo`)
      }
      await page.close()
    }

    // 6. Cars 2, телефон в портрете: тарифы шире попапа — ряд листается, начало не обрезано, коснулись — выехала целиком
    if (screen.key === 'cars2') {
      ;({ page, frame } = await emulator({ screen: screen.id, device: 'iphone8', orient: 'portrait' }))
      await screen.change(frame)
      await sleep(1500)
      const cards = () => frame.$$eval('[role="radio"]', els => els.map(el => ({ left: el.getBoundingClientRect().left, right: el.getBoundingClientRect().right, checked: el.getAttribute('aria-checked') === 'true' })))
      const width = (await inapp(page, () => window.__inapp.screen)).width
      let row = await cards()
      check(`${name} в портрете: начало ряда тарифов на экране, конец — за краем`, row[0].left >= 0 && row[row.length - 1].right > width, JSON.stringify(row))
      await frame.$$eval('[role="radio"]', els => els[els.length - 1].click())
      await sleep(900)
      row = await cards()
      const last = row[row.length - 1]
      check(`${name} в портрете: коснулись последнего тарифа — выбран и виден целиком`, last.checked && last.left >= 0 && last.right <= width, JSON.stringify(row))
      await page.close()
    }
  }

  // Онбординг: два шага, двойной тап не проскакивает шаг, крестик — только на втором, «Continue» на втором закрывает
  if (!only || only === 'onboarding') {
    const name = 'Онбординг Farm'
    const { page, frame } = await emulator({ screen: 'ios_as_farm_ds1_varb_ut1_onboarding_v1', device: 'iphone' })
    let lines = await log(page)
    check(`${name}: «готов» один раз, открыт`, count(lines, 'ready') === 1 && (await state(page)).phase === 'open')
    await sleep(3200)
    check(`${name}: на первом шаге крестика нет`, await frame.$('[data-pw="close"][data-shown]') === null)
    await tapCta(frame)
    await sleep(40)
    await tapCta(frame)
    await sleep(600)
    lines = await log(page)
    const pages = lines.filter(line => line.text.startsWith('mixpanelEventInappScroll')).map(line => line.text)
    check(`${name}: двойной тап — один шаг вперёд`, count(lines, 'close') === 0 && pages.at(-1)?.endsWith('page_number=2'), pages.join(' | '))
    await sleep(3300)
    check(`${name}: на втором шаге крестик появился`, await frame.$('[data-pw="close"][data-shown]') !== null)
    await tapCta(frame)
    await sleep(400)
    lines = await log(page)
    check(`${name}: «Continue» на втором шаге закрывает`, count(lines, 'close') === 1 && problems(lines).length === 0, problems(lines).join(' | '))
    await inapp(page, () => window.__inapp.open())
    await sleep(500)
    lines = await log(page)
    const reopened = lines.filter(line => line.text.startsWith('mixpanelEventInappScroll')).at(-1)?.text
    check(`${name}: повторное открытие — снова с первого шага`, reopened?.endsWith('page_number=1'), reopened)
    await page.close()
  }

  check('ошибок в консоли нет', errors.length === 0, errors.slice(0, 5).join(' | '))
} finally {
  await browser.close()
  await server?.close()
}

const fails = results.filter(level => level === 'FAIL').length
const warns = results.filter(level => level === 'WARN').length
console.log(`\n${results.length - fails - warns} OK, ${fails} FAIL, ${warns} WARN`)
process.exit(fails ? 1 : 0)
