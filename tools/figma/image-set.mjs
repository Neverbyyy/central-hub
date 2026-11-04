// Картинка по конвенции дизайн-системы: <имя>-<размер>{,@2x}.{png,webp} — через canvas в Chrome, без новых библиотек.
//   node tools/figma/image-set.mjs <исходник.png> <папка/имя> small=667 medium=844 large=1024 [crop=x,y,w,h] [quality=0.8] [png=no]
// Размеры — ширина 1x на экране (2x — вдвое, но не больше исходника); пропущенный размер не режется.
// crop — доли исходника 0…1 (например, обрезка кадра телефона). Пейволл: small/medium/large; лендинг: small/wide.
// Кадрирование на размерах разное — запускай на каждый размер отдельно, со своим исходником и crop.
// Лендингу PNG не нужен: png=no. Размер той же ширины, что меньший, пропускается: DsImage возьмёт меньший.
// PNG — запасной вариант для вебвью без webp: грузится редко, но тяжёлый (больше 1 МБ — предупреждение).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { launch } from '../browser.mjs'

const [source, target, ...rest] = process.argv.slice(2)
const options = Object.fromEntries(rest.map(arg => arg.split('=')))
const allSizes = Object.entries(options).filter(([name]) => ['small', 'wide', 'medium', 'large'].includes(name)).map(([name, width]) => [name, Number(width)])
if (!source || !target || !sizes.length) throw new Error('node tools/figma/image-set.mjs <исходник.png> <папка/имя> small=<ширина> [wide=…] [medium=…] [large=…]')
const crop = options.crop ? options.crop.split(',').map(Number) : [0, 0, 1, 1]
const quality = Number(options.quality ?? 0.8)
// Лендингу PNG не нужен: png=no
const withPng = options.png !== 'no'
// Размер той же ширины, что меньший, дал бы копию: DsImage и так возьмёт меньший
const sizes = allSizes.filter(([, width], index) => !allSizes.slice(0, index).some(([, smaller]) => smaller === width))
mkdirSync(dirname(target), { recursive: true })

const browser = await launch()
try {
  const page = await browser.newPage()
  const files = await page.evaluate(async (src, sizes, crop, quality, withPng) => {
    const img = new Image()
    img.src = src
    await img.decode()
    const [cx, cy, cw, ch] = crop.map((v, i) => v * (i % 2 ? img.naturalHeight : img.naturalWidth))
    const out = {}
    for (const [size, width] of sizes) {
      for (const [suffix, scale] of [['', 1], ['@2x', 2]]) {
        const w = Math.min(Math.round(cw), Math.round(width * scale))
        const h = Math.round(ch * w / cw)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, cx, cy, cw, ch, 0, 0, w, h)
        if (withPng) out[`${size}${suffix}.png`] = canvas.toDataURL('image/png')
        out[`${size}${suffix}.webp`] = canvas.toDataURL('image/webp', quality)
      }
    }
    return out
  }, `data:image/png;base64,${readFileSync(source).toString('base64')}`, sizes, crop, quality, withPng)
  for (const [suffix, url] of Object.entries(files)) {
    const file = `${target}-${suffix}`
    const buffer = Buffer.from(url.split(',')[1], 'base64')
    writeFileSync(file, buffer)
    const heavy = suffix.endsWith('.png') ? buffer.length > 1024 * 1024 : buffer.length > 300 * 1024
    console.log(`${file}  ${Math.round(buffer.length / 1024)} КБ${heavy ? '  — тяжело: проверь ширину и crop' : ''}`)
  }
} finally {
  await browser.close()
}
