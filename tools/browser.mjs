// Установленный Chrome для инструментов (нарезка арта, скриншоты): путь — CHROME_PATH или стандартный для ОС
import { existsSync } from 'node:fs'
import puppeteer from 'puppeteer-core'

const CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium'
].filter(Boolean)

export function launch(options = {}) {
  const executablePath = CANDIDATES.find(path => existsSync(path))
  if (!executablePath) throw new Error('Не найден Chrome: укажите путь в CHROME_PATH')
  return puppeteer.launch({ executablePath, headless: true, ...options })
}
