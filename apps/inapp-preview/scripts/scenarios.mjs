// Сценарии пейволлов и онбординга из ТЗ — в эмуляторе InApp, по настоящему протоколу (экран в iframe).
//   pnpm --filter @amaya/inapp-preview scenarios                — сам поднимает vite на свободном порту
//   node apps/inapp-preview/scripts/scenarios.mjs --url http://localhost:6011 [--only cars2]
// Эмулятором управляет window.__inapp (src/emulator/InAppEmulator.vue): open, close, pay(итог), log, state, screen.
// Итог: строки OK / FAIL, код выхода 1, если есть FAIL. На iPhone Duo всё, что нажимается, — в safe area и в скруглении
// экрана: фон и арт могут заходить в отступы, а адаптер InApp наши экраны не обрабатывает.
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
    // Тарифы и кнопка — одной колонкой: центры совпадают, кнопка не шире колонки
    column: true,
    locked: '[role="radio"], [role="switch"]',
    change: async frame => frame.evaluate(() => document.querySelectorAll('[role="radio"]')[1]?.click()),
    changed: frame => frame.evaluate(() => document.querySelectorAll('[role="radio"]')[1]?.getAttribute('aria-checked') === 'true')
  },
  {
    key: 'farm-click',
    title: 'Farm On click',
    id: 'ios_as_farm_ds1_varb_ut1_pw_trio_v1',
    column: true,
    locked: '[role="radio"]',
    change: async frame => frame.evaluate(() => document.querySelectorAll('[role="radio"]')[2]?.click()),
    changed: frame => frame.evaluate(() => document.querySelectorAll('[role="radio"]')[2]?.getAttribute('aria-checked') === 'true')
  },
  {
    // Вертикальный экран: проверяется в портрете, на телефонах от iPhone SE до Pro Max и на iPad
    key: 'babycare',
    title: 'Baby Care',
    id: 'ios_pp_babycare_ds1_varb_pw_duo_v1',
    orient: 'portrait',
    devices: ['se', 'iphone8', 'android', 'iphone', 'promax', 'ipad', 'ipadmini'],
    column: true,
    locked: '[role="radio"]',
    change: async frame => frame.evaluate(() => document.querySelectorAll('[role="radio"]')[1]?.click()),
    changed: frame => frame.evaluate(() => document.querySelectorAll('[role="radio"]')[1]?.getAttribute('aria-checked') === 'true')
  }
].filter(screen => !only || screen.key === only)

const DUO_POSES = [
  { device: 'duo-folded-l', orient: 'landscape' },
  { device: 'duo-folded-r', orient: 'landscape' },
  { device: 'duo-folded-l', orient: 'portrait' },
  { device: 'duo-unfolded', orient: 'landscape' },
  { device: 'duo-unfolded-r', orient: 'landscape' },
  { device: 'duo-half', orient: 'landscape' },
  { device: 'duo-unfolded', orient: 'portrait' }
]
const DUO_SCREENS = [
  { key: 'cars2', title: 'Cars 2', id: 'ios_as_cars2_ds1_varb_t1_pw_slider_v1', state: { name: 'попап тарифов', tap: '[data-pw="more"]', wait: 800 } },
  { key: 'farm-start', title: 'Farm On start', id: 'ios_as_farm_ds1_varb_ut1_pw_switch_v1' },
  { key: 'farm-click', title: 'Farm On click', id: 'ios_as_farm_ds1_varb_ut1_pw_trio_v1' },
  { key: 'onboarding', title: 'Онбординг Farm', id: 'ios_as_farm_ds1_varb_ut1_onboarding_v1', state: { name: 'шаг 2', tap: '[data-pw="cta"]', wait: 3500 } },
  { key: 'babycare', title: 'Baby Care', id: 'ios_pp_babycare_ds1_varb_pw_duo_v1', orient: 'portrait' }
]

/**
 * Что нажимается и стоит за safe area или за скруглением экрана. Подэкранная камера не считается: она видна, только
 * пока включена. Хвост карусели, которая листается, — тоже: он приезжает в safe area при прокрутке.
 */
const offSafeArea = (frame, pose) => frame.$$eval('a, button, [role="button"], [role="radio"], [role="switch"], [data-pw], [data-legal]', (elements, { width, height, insets, radii }) => {
  const safe = { left: insets.left, top: insets.top, right: width - insets.right, bottom: height - insets.bottom }
  // top-left, top-right, bottom-right, bottom-left — как у позы
  const arcs = [[0, 0, 1, 1], [width, 0, -1, 1], [width, height, -1, -1], [0, height, 1, -1]]
  const outsideArc = (x, y) => arcs.some(([cornerX, cornerY, dirX, dirY], index) => {
    const radius = radii[index]
    const dx = radius - (x - cornerX) * dirX
    const dy = radius - (y - cornerY) * dirY
    return dx > 0 && dy > 0 && Math.hypot(dx, dy) > radius
  })
  return elements.flatMap((element) => {
    const box = element.getBoundingClientRect()
    const style = getComputedStyle(element)
    const hidden = box.width < 2 || box.height < 2 || style.visibility === 'hidden' || Number(style.opacity) === 0 || element.closest('[inert],[aria-hidden="true"]')
    const carousel = element.closest('.ds-carousel')
    const tail = carousel && carousel.scrollWidth > carousel.clientWidth + 2 && !element.closest('[data-pw]')
    if (hidden || tail) return []
    const name = element.getAttribute('data-pw') ?? element.getAttribute('data-legal') ?? (element.getAttribute('aria-label') || element.textContent).trim().slice(0, 24)
    const out = box.left < safe.left - 1 || box.top < safe.top - 1 || box.right > safe.right + 1 || box.bottom > safe.bottom + 1
    const corners = [[box.left, box.top], [box.right, box.top], [box.right, box.bottom], [box.left, box.bottom]]
    if (out) return [`${name} (${Math.round(box.left)}–${Math.round(box.right)} × ${Math.round(box.top)}–${Math.round(box.bottom)})`]
    return corners.some(([x, y]) => outsideArc(x, y)) ? [`${name} в скруглении`] : []
  })
}, pose)

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
    const orient = screen.orient ? { orient: screen.orient } : {}
    // Вертикальный телефон выше окна 800: рамка уменьшилась бы, а клик мышью в уменьшенный iframe попадает мимо
    const viewport = screen.orient === 'portrait' ? { width: 1400, height: 1000 } : undefined
    let { page, frame } = await emulator({ screen: screen.id, device: 'iphone', ...orient }, viewport)
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
    ;({ page } = await emulator({ screen: screen.id, preset: 'noProduct', ...orient }))
    lines = await log(page)
    check(`${name}, нет продукта: закрыт без «готов»`, count(lines, 'ready') === 0 && count(lines, 'close') === 1 && (await state(page)).phase === 'closed', lines.map(l => l.text).join(' | '))
    await page.close()
    for (const preset of ['wasTrial', 'euro']) {
      ;({ page } = await emulator({ screen: screen.id, preset, ...orient }))
      lines = await log(page)
      const current = await state(page)
      check(`${name}, ${preset}: открыт без ошибок`, current.phase === 'open' && problems(lines).length === 0, JSON.stringify(current))
      await page.close()
    }

    // 5. Размеры и немецкий: главная кнопка, тарифы, заголовок, документы и крестик — целиком на экране
    for (const device of screen.devices ?? ['se', 'iphone8', 'iphone', 'promax', 'ipad', 'tall', 'duo-folded-l', 'duo-folded-r', 'duo-unfolded', 'duo-unfolded-r']) {
      ;({ page, frame } = await emulator({ screen: screen.id, device, lang: 'de', ...orient }))
      await sleep(3300)
      const geometry = await inapp(page, () => window.__inapp.screen)
      const boxes = await frame.$$eval('[data-pw="cta"], [data-pw="close"], [role="radio"], [role="switch"], h1, [data-legal]', els => els.map((el) => {
        const r = el.getBoundingClientRect()
        return { name: (el.getAttribute('data-pw') ?? el.getAttribute('data-legal') ?? el.getAttribute('role') ?? el.tagName).toLowerCase(), x: r.left, y: r.top, w: r.width, h: r.height }
      }).filter(box => box.w > 0))
      const outside = boxes.filter(box => box.x < -1 || box.y < -1 || box.x + box.w > geometry.width + 1 || box.y + box.h > geometry.height + 1).map(box => box.name)
      check(`${name} ${device} (${geometry.width}×${geometry.height}), немецкий: всё на экране`, outside.length === 0, outside.join(', '))
      if (screen.column) {
        // Farm On click: у кнопки были и «во всю ширину», и поля — она сдвигалась вправо за колонку, тарифы казались прижатыми влево
        const axis = await frame.evaluate(() => {
          const center = (el) => {
            const r = el.getBoundingClientRect()
            return (r.left + r.right) / 2
          }
          const cta = document.querySelector('[data-pw="cta"]')
          const column = cta.parentElement.getBoundingClientRect()
          const button = cta.getBoundingClientRect()
          const centers = [center(cta), ...[...document.querySelectorAll('[role="radio"]')].map(center)]
          return { spread: Math.max(...centers) - Math.min(...centers), inside: button.left >= column.left - 1 && button.right <= column.right + 1 }
        })
        check(`${name} ${device}: тарифы и кнопка по одной оси, кнопка в колонке`, axis.spread <= 1 && axis.inside, `разброс ${Math.round(axis.spread)} px${axis.inside ? '' : ', кнопка вылезает'}`)
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

  // Эмулятор на телефоне: экран на всё окно, панель — по кнопке, итог покупки — плашкой поверх экрана
  if (!only || only === 'cars2') {
    const name = 'Эмулятор на телефоне'
    const { page, frame } = await emulator({ screen: 'ios_as_cars2_ds1_varb_t1_pw_slider_v1' }, { width: 390, height: 844, isMobile: true, hasTouch: true })
    const iframe = await page.$eval('iframe', el => ({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height }))
    check(`${name}: экран на всё окно`, iframe.width === 390 && iframe.height === 844, JSON.stringify(iframe))
    const panelTop = () => page.$eval('.emu-panel', el => el.getBoundingClientRect().top)
    check(`${name}: панель скрыта`, await panelTop() >= 844)
    await page.tap('.emu-menu')
    await sleep(400)
    check(`${name}: кнопка открывает панель`, await panelTop() < 844)
    await page.tap('.emu-head button')
    await sleep(400)
    check(`${name}: панель закрывается`, await panelTop() >= 844)
    await tapCta(frame)
    await sleep(300)
    check(`${name}: покупка спрашивает итог плашкой`, await page.$('.emu > .emu-purchase') !== null)
    await page.tap('.emu-purchase .emu-ok')
    await sleep(600)
    check(`${name}: итог дошёл до экрана`, (await state(page)).purchasing === null, JSON.stringify(await state(page)))
    await page.close()
  }

  // «Только экран», без приложения: закрылся — кнопка открывает его снова, как новый, без перезагрузки
  if (!only || only === 'cars2') {
    const name = 'Только экран'
    const page = await browser.newPage()
    page.on('pageerror', error => errors.push(error.message))
    await page.setViewport({ width: 844, height: 390 })
    await page.goto(`${base}/?variant=ios_as_cars2_ds1_varb_t1_pw_slider_v1&preset=default`, { waitUntil: 'load' })
    await page.waitForSelector('[data-pw="close"][data-shown]', { timeout: 8000 })
    // Попап оставлен открытым: новый экран должен открыться без него. Под затемнением попапа клик мышью до крестика не дойдёт
    await page.evaluate(() => document.querySelector('[data-pw="more"]').click())
    await sleep(300)
    await page.evaluate(() => document.querySelector('[data-pw="close"]').click())
    const notice = await page.waitForSelector('.screen-closed', { timeout: 2000 }).catch(() => null)
    check(`${name}: закрылся — есть кнопка «Открыть снова»`, notice !== null)
    await page.click('.screen-closed button')
    await sleep(300)
    check(`${name}: открылся снова, как новый`, await page.$('[data-opened]') !== null && await page.$('.screen-closed') === null && await page.$('[role="dialog"]') === null)
    await page.close()
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

  // iPhone Duo: все позы, немецкий (самый длинный текст) и состояния экрана, где появляются новые кнопки
  for (const { title, id, state, orient: screenOrient } of DUO_SCREENS.filter(item => !only || item.key === only)) {
    for (const { device, orient } of DUO_POSES.filter(pose => !screenOrient || pose.orient === screenOrient)) {
      const { page, frame } = await emulator({ screen: id, device, orient, lang: 'de' })
      await sleep(3300)
      const { duo } = await inapp(page, () => window.__inapp.screen)
      const pose = `${title}, ${device} ${orient}`
      let bad = await offSafeArea(frame, duo)
      check(`${pose}: нажимаемое в safe area`, bad.length === 0, bad.join(', '))
      if (state) {
        // Не клик мышью: рамка уменьшена под окно, и точка нажатия внутри iframe считается неверно
        await frame.$eval(state.tap, element => element.click())
        await sleep(state.wait)
        bad = await offSafeArea(frame, duo)
        check(`${pose}, ${state.name}: нажимаемое в safe area`, bad.length === 0, bad.join(', '))
      }
      await page.close()
    }
  }

  check('ошибок в консоли нет', errors.length === 0, errors.slice(0, 5).join(' | '))
} finally {
  await browser.close()
  await server?.close()
}

const fails = results.filter(level => level === 'FAIL').length
console.log(`\n${results.length - fails} OK, ${fails} FAIL`)
process.exit(fails ? 1 : 0)
