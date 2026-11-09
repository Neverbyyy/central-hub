// Скриншоты страницы или истории Storybook на размерах макетов — для сравнения с эталоном из Figma.
//   node tools/shot.mjs <адрес> <папка> [667x375 844x390 1024x768 …] [--full] [--click <селектор>]… [--wait <мс>]
//   node tools/shot.mjs "http://localhost:6006/iframe.html?id=пейволлы-farm--on-start&viewMode=story" shots
//   node tools/shot.mjs "<онбординг>" shots 844x390 --click ".ds-button" — второй шаг: нажать главную кнопку и снять
// Пишет <папка>/<ширина>x<высота>.png (после кликов — …-<число кликов>.png) и выводит ошибки консоли,
// неудачные запросы с адресом и горизонтальную прокрутку, если они есть
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { launch } from './browser.mjs'

const args = process.argv.slice(2)
const option = (name) => {
  const values = []
  for (let at = args.indexOf(name); at >= 0; at = args.indexOf(name)) values.push(args.splice(at, 2)[1])
  return values
}
const clicks = option('--click')
const wait = Number(option('--wait')[0] ?? 1500)
const full = args.includes('--full')
const [url, out, ...rest] = args.filter(arg => arg !== '--full')
if (!url || !out) throw new Error('node tools/shot.mjs <адрес> <папка> [ширинаxвысота …] [--full] [--click <селектор>]… [--wait <мс>]')
const sizes = (rest.length ? rest : ['667x375', '844x390', '1024x768']).map(size => size.split('x').map(Number))
mkdirSync(out, { recursive: true })

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const browser = await launch()
try {
  for (const [width, height] of sizes) {
    const page = await browser.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    // «Failed to load resource» без адреса бесполезен — неудачные запросы пишем сами, с адресом
    page.on('console', message => message.type() === 'error' && !/favicon|Failed to load resource/.test(message.text()) && errors.push(message.text()))
    page.on('response', response => response.status() >= 400 && !/favicon/.test(response.url()) && errors.push(`${response.status()} ${response.url()}`))
    page.on('requestfailed', request => !/favicon/.test(request.url()) && errors.push(`${request.failure()?.errorText} ${request.url()}`))
    await page.setViewport({ width, height })
    await page.goto(url, { waitUntil: 'load' })
    await sleep(wait)
    const shoot = async (suffix) => {
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
      const file = join(out, `${width}x${height}${suffix}.png`)
      await page.screenshot({ path: file, fullPage: full })
      console.log(file, overflow > 0 ? `горизонтальная прокрутка +${overflow}px` : '', errors.length ? `ошибки: ${errors.join(' | ')}` : '')
      errors.length = 0
    }
    await shoot('')
    for (const [index, selector] of clicks.entries()) {
      await page.click(selector)
      await sleep(wait)
      await shoot(`-${index + 1}`)
    }
    await page.close()
  }
} finally {
  await browser.close()
}
