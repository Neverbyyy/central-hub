// Пейволл Cars 2 внутри настоящего InApp (клон): полный сценарий по его же мосту. node inapp.mjs <адрес> <папка снимков>
import { mkdirSync } from 'node:fs'
import { launch } from '../../../tools/browser.mjs'

const [base, out] = process.argv.slice(2)
mkdirSync(out, { recursive: true })
const VARIANT = 'ios_as_cars2_ds1_varb_t1_pw_slider_v1'
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const results = []
const check = (name, ok, detail = '') => {
  results.push(ok)
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${ok || !detail ? '' : ` — ${String(detail).slice(0, 200)}`}`)
}

const browser = await launch()
try {
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message.slice(0, 160)))
  page.on('console', message => message.type() === 'error' && !/favicon|Failed to load resource/.test(message.text()) && errors.push(message.text().slice(0, 160)))
  // Режим hyper: команды приложению идут в postMessage, их можно записать и ответить, как приложение
  await page.evaluateOnNewDocument(() => {
    window.__commands = []
    addEventListener('message', (event) => {
      if (event.data?.instance === 'inapp' && typeof event.data.url === 'string') window.__commands.push(event.data.url.replace('uniwebview://', ''))
    })
  })
  await page.setViewport({ width: 844, height: 390, deviceScaleFactor: 2 })
  await page.goto(`${base}/?debugEnabled=true&isHyper=1&lang=en&variant=${VARIANT}`, { waitUntil: 'load', timeout: 120000 })
  await page.waitForSelector('[data-ds-root]', { timeout: 60000 })
  // Как приложение: open только после ready
  await page.waitForFunction(() => window.__commands.includes('ready'), { timeout: 30000 })
  await page.evaluate(() => window.postMessage({ eventName: 'open' }, '*'))
  await sleep(1500)

  const commands = () => page.evaluate(() => window.__commands)
  const count = async name => (await commands()).filter(item => item.split('?')[0] === name).length
  const hasOpened = () => page.evaluate(() => !!document.querySelector('[data-opened]'))
  const busy = () => page.evaluate(() => document.querySelector('[data-pw="cta"]')?.getAttribute('aria-busy') === 'true')
  const gate = () => page.evaluate(() => !!document.querySelector('.overlay.show .window'))
  const click = selector => page.evaluate(value => document.querySelector(value)?.click(), selector)
  const app = (eventName, data) => page.evaluate((name, payload) => window.postMessage({ eventName: name, data: payload }, '*'), eventName, data)
  const year = async () => {
    for (const digit of ['1', '9', '8', '0']) {
      await page.evaluate((value) => {
        const key = [...document.querySelectorAll('.overlay.show .window *')].find(item => !item.children.length && item.textContent.trim() === value && !item.closest('.nums'))
        key?.click()
      }, digit)
      await sleep(80)
    }
    await sleep(500)
  }

  check('экран смонтирован и открыт', await hasOpened())
  check('«готов» ушёл один раз', (await count('ready')) === 1, (await commands()).join(' | '))
  const text = await page.evaluate(() => document.querySelector('[data-ds-root]').textContent)
  check('тексты из сервиса, а не ключи', !/app\.cars2|common\.[a-z]|ds\.[a-z]/.test(text), text.slice(0, 160))
  await page.screenshot({ path: `${out}/open-844.png` })

  await sleep(3200)
  check('крестик появился с задержкой', await page.evaluate(() => !!document.querySelector('[data-pw="close"][data-shown]')))

  await click('[data-pw="cta"]')
  await sleep(400)
  check('покупка начинается с родительского гейта', await gate())
  check('кнопка в загрузке, buy ещё нет', (await busy()) && (await count('buy')) === 0, `busy ${await busy()}`)
  await page.screenshot({ path: `${out}/gate-844.png` })

  await click('.overlay.show .close')
  await sleep(400)
  check('отказ от гейта: загрузка снята, buy нет', !(await busy()) && !(await gate()) && (await count('buy')) === 0, `busy ${await busy()} gate ${await gate()}`)

  await sleep(900)
  await click('[data-pw="cta"]')
  await sleep(300)
  await year()
  check('гейт пройден: один buy нужного продукта', (await commands()).filter(item => item.startsWith('buy')).join() === 'buy?Id=com.amayasoft.cars2.yearly.trial3.3999', (await commands()).join(' | '))
  await app('payment', 'cancel')
  await sleep(400)
  check('payment cancel: снова выбор, экран открыт', !(await busy()) && (await hasOpened()) && (await count('close')) === 0, `busy ${await busy()}`)

  await sleep(900)
  await click('[data-pw="cta"]')
  await sleep(300)
  await year()
  await app('payment', 'error')
  await sleep(400)
  check('payment error: снова выбор', !(await busy()) && (await hasOpened()), `busy ${await busy()}`)

  await sleep(900)
  await click('[data-pw="more"]')
  await sleep(500)
  check('попап тарифов открылся', await page.evaluate(() => !!document.querySelector('[role="dialog"]')))
  await page.screenshot({ path: `${out}/popup-844.png` })
  await page.keyboard.press('Escape')
  await sleep(500)

  await sleep(900)
  await click('[data-pw="cta"]')
  await sleep(300)
  await year()
  await app('payment', 'success')
  await sleep(700)
  check('payment success: один close, экран закрыт', (await count('close')) === 1 && !(await hasOpened()), (await commands()).join(' | '))

  await app('open')
  await sleep(600)
  check('повторное открытие: экран как новый, «готов» не задвоился', (await hasOpened()) && (await count('ready')) === 1 && !(await busy()), `ready ${await count('ready')}`)

  await page.evaluate(() => [...document.querySelectorAll('[data-ds-root] a, [data-ds-root] button')].find(item => /Terms/.test(item.textContent))?.click())
  await sleep(400)
  check('документы: сначала гейт', await gate())
  await year()
  check('документы: после гейта openLink с адресом Amaya', (await commands()).some(item => item.startsWith('openLink') && decodeURIComponent(item).includes('amayakids.com/terms')), (await commands()).slice(-3).join(' | '))

  await page.evaluate(() => [...document.querySelectorAll('[data-ds-root] a, [data-ds-root] button')].find(item => /Restore/.test(item.textContent))?.click())
  await sleep(300)
  check('Restore уходит приложению', (await count('restorePurchases')) === 1, (await commands()).slice(-3).join(' | '))

  await sleep(3300)
  await click('[data-pw="close"]')
  await sleep(700)
  check('крестик закрывает, close всего два', (await count('close')) === 2 && !(await hasOpened()), (await commands()).join(' | '))

  console.log('\nкоманды приложению:', (await commands()).map(item => item.split('?')[0]).join(' '))
  check('ошибок на странице нет', errors.length === 0, [...new Set(errors)].slice(0, 3).join(' | '))

  // Вид и язык
  for (const [name, width, height, lang] of [['iphone8-ru', 667, 375, 'ru'], ['iphone-de', 844, 390, 'de'], ['ipad-en', 1024, 768, 'en']]) {
    const view = await browser.newPage()
    await view.setViewport({ width, height, deviceScaleFactor: 1 })
    await view.goto(`${base}/?debugEnabled=true&isHyper=1&lang=${lang}&variant=${VARIANT}`, { waitUntil: 'load', timeout: 120000 })
    await view.waitForFunction(() => !!document.querySelector('[data-ds-root]'), { timeout: 60000 })
    await sleep(1500)
    await view.evaluate(() => window.postMessage({ eventName: 'open' }, '*'))
    await view.waitForSelector('[data-opened]', { timeout: 30000 })
    await sleep(2000)
    const cta = await view.$eval('[data-pw="cta"]', item => item.textContent.trim())
    console.log(`${name}: кнопка «${cta}»`)
    await view.screenshot({ path: `${out}/${name}.png` })
    await view.close()
  }
} finally {
  await browser.close()
}
const fails = results.filter(ok => !ok).length
console.log(`\n${results.length - fails} OK, ${fails} FAIL`)
