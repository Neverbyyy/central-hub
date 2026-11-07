// Перенос пейволла Cars 2 в клон InApp. Каждая правка записана здесь: это черновик будущего pnpm deliver.
// Запуск: node deliver-pilot.mjs <монорепо> <клон>
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const [repo, clone] = process.argv.slice(2)
const VARIANT = 'ios_as_cars2_ds1_varb_t1_pw_slider_v1'
const OLD = 'ios_as_cars2_tm11_varb_t1_pw_slider_v1'
const GAME = 'com.amayasoft.cars.kids.racing.toddlers.garage.game'
const source = join(repo, 'apps/inapp-preview/src/variants/ios/as/cars2/ds1/pw-slider')
const target = join(clone, 'src/components/variants/ios/as/cars2/ds1/pw-slider/v1')
const read = file => readFileSync(file, 'utf8')
const once = (text, from, to, what) => {
  if (!text.includes(from)) throw new Error(`нет фрагмента: ${what}`)
  return text.replace(from, () => to)
}

// 0. Адаптер окружения — один на все экраны
mkdirSync(join(clone, 'src/utils'), { recursive: true })
cpSync(join(repo, 'packages/inapp-kit/templates/dsEnv.ts'), join(clone, 'src/utils/dsEnv.ts'))

// 1. Папка экрана: арт экрана и общий арт наборов машин (в монорепо он в packages/art, здесь — рядом)
mkdirSync(target, { recursive: true })
cpSync(join(source, 'art'), join(target, 'art'), { recursive: true })
cpSync(join(repo, 'packages/art/cars2/unlock'), join(target, 'art/unlock'), { recursive: true })

writeFileSync(join(target, 'unlocks.ts'), `// Наборы машин: в монорепо общие с лендингом, в InApp — в папке экрана
import { imageSetFromFiles } from '@amaya/inapp-kit'

export const CARS2_UNLOCKS = ['city', 'christmas', 'halloween', 'construction', 'modern', 'zoo', 'monstertrucks'] as const
export type Cars2Unlock = typeof CARS2_UNLOCKS[number]

const unlockFiles = import.meta.glob<string>('./art/unlock/*.{png,webp}', { query: '?url', import: 'default', eager: true })

export const cars2UnlockArt = (name: Cars2Unlock) => imageSetFromFiles(unlockFiles, \`./art/unlock/\${name}\`)
`)

let config = read(join(source, 'config.ts'))
config = once(config, `import { CARS2_UNLOCKS, cars2Animation, cars2UnlockArt } from '@amaya/art/cars2'\n`, `import { CARS2_UNLOCKS, cars2UnlockArt } from './unlocks'\n`, 'импорт арта')
config = once(config, `import type { HeroLive, HeroSliderConfig } from '@amaya/paywall-kit'\n`, `import type { HeroSliderConfig } from '@amaya/inapp-kit'\n`, 'импорт типов')
config = once(config, `import { imageSetFromFiles } from '@amaya/ui'\n`, `import { imageSetFromFiles } from '@amaya/inapp-kit'\n`, 'импорт imageSetFromFiles')
// Живая карточка в экране не включена: Rive и .riv в перенос не идут
const liveStart = config.indexOf('/**\n * Живая карточка')
const liveEnd = config.indexOf('\n', config.indexOf('export const live: HeroLive')) + 1
if (liveStart < 0 || liveEnd <= 0) throw new Error('нет блока live')
config = config.slice(0, liveStart) + config.slice(liveEnd)
writeFileSync(join(target, 'config.ts'), config)

writeFileSync(join(target, 'index.vue'), `<script setup lang="ts">
// Пейволл Cars 2 на дизайн-системе: шаблон из @amaya/inapp-kit с конфигом экрана
import { PwHeroSlider } from '@amaya/inapp-kit'
import '@amaya/inapp-kit/style.css'
import { useDsEnv } from '@/utils/dsEnv'
import { config } from './config'

const env = useDsEnv({
  legal: { terms: 'https://amayakids.com/terms.html', privacy: 'https://amayakids.com/privacy.html' }
})
</script>

<template>
  <PwHeroSlider
    :env="env"
    :config="config"
  />
</template>
`)

// 2. componentMap.ts
const mapFile = join(clone, 'src/utils/componentMap.ts')
const map = read(mapFile)
if (!map.includes(VARIANT)) {
  writeFileSync(mapFile, once(map, `  ${OLD}:`, `  ${VARIANT}: () => import('@/components/variants/ios/as/cars2/ds1/pw-slider/v1/index.vue'),\n  ${OLD}:`, 'componentMap'))
}

// 3. useConfig.ts: только правило варианта. Продукты в gamesToProducts не нужны: экран покупает по ID стора, цены — из данных приложения
const configFile = join(clone, 'src/composables/useConfig.ts')
const useConfig = read(configFile)
if (!useConfig.includes(VARIANT)) {
  const marker = `    {\n      'variant': '${OLD}',`
  const eol = useConfig.includes(`{\r\n      'variant': '${OLD}'`) ? '\r\n' : '\n'
  const anchor = eol === '\n' ? marker : marker.replaceAll('\n', '\r\n')
  const rule = [
    '    {',
    `      'variant': '${VARIANT}',`,
    `      'rules': [`,
    `        { prop: 'isGameId', rule: 'equal', value: '${GAME}' },`,
    `        { prop: 'isVariant', rule: 'equal', value: '${VARIANT}' },`,
    '      ],',
    '    },',
    ''
  ].join(eol)
  writeFileSync(configFile, once(useConfig, anchor, rule + anchor, 'useConfig'))
}

// 4. Пресет: данные приложения для отладки — как у старого варианта, продукты — из presets.ts экрана
const preset = JSON.parse(read(join(clone, `src/presets/${OLD}.json`)))
const packs = ['city', 'christmas', 'halloween', 'construction', 'modern', 'zoo', 'monstertrucks']
preset.variant = VARIANT
preset.productData = [
  { Id: 'com.amayasoft.cars2.yearly.trial3.3999', Price: '$39.99' },
  { Id: 'com.amayasoft.cars2.yearly.notrial.3499', Price: '$34.99' },
  { Id: 'com.amayasoft.cars2.weekly.trial3', Price: '$9.99' },
  ...packs.map(name => ({ Id: `com.amayasoft.cars2.${name}.599`, Price: '$5.99' }))
]
writeFileSync(join(clone, `src/presets/${VARIANT}.json`), `${JSON.stringify(preset, null, 2)}\n`)

// 5. debug/variants.json
const debugFile = join(clone, 'src/components/debug/variants.json')
const debug = read(debugFile)
if (!debug.includes(VARIANT)) {
  writeFileSync(debugFile, once(debug, `"${OLD}",`, `"${VARIANT}",\n              "${OLD}",`, 'variants.json'))
}

// main.ts: правила множественного числа, один раз на весь InApp
const mainFile = join(clone, 'src/main.ts')
const main = read(mainFile)
if (!main.includes('@amaya/inapp-kit/plural')) {
  const withImport = once(main, 'import { createI18n } from \'vue-i18n\';', 'import { createI18n } from \'vue-i18n\';\nimport { pluralRules } from \'@amaya/inapp-kit/plural\';', 'импорт i18n в main.ts')
  writeFileSync(mainFile, once(withImport, '  legacy: false,', '  legacy: false,\n  pluralRules,', 'createI18n в main.ts'))
}

// Тексты: CLI с набором inapp
if (!existsSync(join(clone, 'amaya-l10n.json'))) {
  writeFileSync(join(clone, 'amaya-l10n.json'), `${JSON.stringify({ hub: 'https://central-hub-sigma.vercel.app', set: 'inapp' }, null, 2)}\n`)
}
console.log('перенос готов')
