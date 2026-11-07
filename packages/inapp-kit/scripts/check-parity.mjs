// Экран в InApp совпадает с эмулятором: положения элементов на тех же размерах: node parity.mjs <эмулятор> <клон InApp>
import { launch } from '../../../tools/browser.mjs'

const [emulator, clone] = process.argv.slice(2)
const VARIANT = 'ios_as_cars2_ds1_varb_t1_pw_slider_v1'
const SIZES = [[844, 390], [667, 375], [568, 320], [1024, 768]]
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const browser = await launch()

const boxes = page => page.$$eval('[data-ds-root] [data-pw], [data-ds-root] h1, [data-ds-root] p, [data-ds-root] img, [data-ds-root] a, [data-ds-root] button, [data-unlock]', items => items.map((item) => {
  const box = item.getBoundingClientRect()
  return `${item.tagName}:${Math.round(box.x)},${Math.round(box.y)},${Math.round(box.width)},${Math.round(box.height)}`
}).filter(line => !/,0,0$/.test(line)))

const open = async (url, width, height, viaApp) => {
  const page = await browser.newPage()
  await page.setViewport({ width, height })
  await page.goto(url, { waitUntil: 'load', timeout: 120000 })
  await page.waitForSelector('[data-ds-root]', { timeout: 60000 })
  await sleep(1500)
  if (viaApp) await page.evaluate(() => window.postMessage({ eventName: 'open' }, '*'))
  await page.waitForSelector('[data-opened]', { timeout: 15000 })
  await sleep(1500)
  return page
}

let total = 0
try {
  for (const [width, height] of SIZES) {
    const first = await open(`${emulator}/?variant=${VARIANT}&preset=default&lang=en`, width, height, false)
    const second = await open(`${clone}/?debugEnabled=true&isHyper=1&lang=en&variant=${VARIANT}`, width, height, true)
    const was = await boxes(first)
    const now = await boxes(second)
    const rest = [...now]
    const gone = was.filter((box) => {
      const at = rest.indexOf(box)
      if (at < 0) return true
      rest.splice(at, 1)
      return false
    })
    total += gone.length + rest.length
    console.log(`${width}×${height}: эмулятор ${was.length}, InApp ${now.length}, расходится ${gone.length}${gone.length ? ` | было ${gone.slice(0, 3).join(' ')} | стало ${rest.slice(0, 3).join(' ')}` : ''}`)
    await first.close()
    await second.close()
  }
} finally {
  await browser.close()
}
console.log(total ? `расхождений: ${total}` : 'совпадает на всех размерах')
