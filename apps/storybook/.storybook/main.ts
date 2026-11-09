import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { StorybookConfig } from '@storybook/vue3-vite'
import { storyNameFromExport } from 'storybook/internal/csf'
import type { Plugin } from 'vite'

// Лендинги — папки app/landings, как у сборки: индекс Storybook узнаёт об историях из этих папок, а плагин дописывает их
// в stories/Landings.stories.ts. Новый лендинг появляется в Storybook сам, отдельный файл истории ему не нужен
const LANDINGS_DIR = fileURLToPath(new URL('../../landings/app/landings', import.meta.url))
const LANDING_STORIES = /stories[\\/]Landings\.stories\.ts$/
const landings = () => readdirSync(LANDINGS_DIR, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name)
// cars2-go → Cars2Go: имя экспорта, из него Storybook строит подпись «Cars 2 Go»
const exportName = (landing: string) => landing.replace(/(?:^|-)(\w)/g, (_, letter: string) => letter.toUpperCase())
// Игра — начало имени папки: cars2 и cars2-go — лендинги Cars 2
const game = (landing: string) => landing.split('-')[0]!
const label = (name: string) => storyNameFromExport(exportName(name))

/**
 * Где лендинг в боковой панели: заголовок — игра («Лендинги/Cars 2»), имя истории — лендинг. Несколько лендингов
 * у игры — выпадающий список с такой же иконкой, как у пейволлов и компонентов («Cars 2» → Cars 2, Cars 2 Go), один —
 * строкой («Farm»: имя истории совпадает с заголовком, Storybook не делает из него список).
 * Адрес истории — от заголовка и имени экспорта: у основного лендинга игры он не меняется, когда появляется второй.
 */
export function landingEntry(landing: string) {
  return {
    exportName: exportName(landing),
    name: label(landing),
    title: `Лендинги/${label(game(landing))}`
  }
}

const landingStories: Plugin = {
  name: 'amaya:landing-stories',
  enforce: 'pre',
  transform(code, id) {
    if (!LANDING_STORIES.test(id.split('?')[0]!)) return null
    return `${code}\n${landings().map(landing => `export const ${exportName(landing)} = { args: { landing: '${landing}' } }`).join('\n')}\n`
  }
}

const config: StorybookConfig = {
  // Истории компонентов лежат рядом с ними в пакетах, общие (токены, целые страницы) — в ../stories
  stories: [
    '../stories/**/*.stories.ts',
    '../../../packages/*/src/**/*.stories.ts',
    // Целые экраны: пейволлы Cars 2 и Farm, устроенные как варианты InApp
    '../../inapp-preview/src/**/*.stories.ts'
  ],
  framework: '@storybook/vue3-vite',
  // Картинки для историй: арт Cars 2 из InApp и значки сторов из Pages Hub — в public
  staticDirs: ['../public'],
  core: {
    disableTelemetry: true
  },
  experimental_indexers: indexers => [
    {
      test: LANDING_STORIES,
      // Файл один, но у каждой истории свой заголовок, поэтому «Лендинги» — раздел, а лендинги игры — её список
      createIndex: async fileName => landings().map(landing => ({ type: 'story' as const, importPath: fileName, ...landingEntry(landing) }))
    },
    ...(indexers ?? [])
  ],
  viteFinal: viteConfig => ({ ...viteConfig, plugins: [landingStories, ...(viteConfig.plugins ?? [])] })
}

export default config
