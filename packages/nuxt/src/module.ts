// Nuxt-модуль дизайн-системы: modules: ['@amaya/nuxt'] — и в приложении есть всё для лендинга:
//   - Tailwind 4 с пресетом ds: (@amaya/ui/tailwind.css) и источниками классов пакетов и самого приложения;
//   - шрифты Nunito и Open Sans (с кириллицей, из сборки) и preload Nunito для первого экрана;
//   - компоненты Ds* и блоки Lk* без импортов; track, imageSet, imageSetFromFiles — автоимпортом;
//   - vue-i18n с текстами из сервиса (@amaya/locales, только утверждённые) и формами множественного числа;
//     тексты — только языка страницы: await useLocale(lang);
//   - Rive: wasm со своего адреса, а не с unpkg.
// Пути пакетов модуль находит сам: у приложения в зависимостях только @amaya/nuxt.
// Приложение-хост со своими страницами (Pages Hub) — amaya: { embedded: true }: глобально модуль ничего не подключает,
// стили, шрифт и Rive приходят на нашу страницу через useDsPage(), а vue-i18n, тексты и Tailwind 4 — хоста
import { createRequire } from 'node:module'
import { basename, dirname, join, resolve as resolvePath } from 'node:path'
import { addComponentsDir, addImports, addPlugin, addTemplate, addVitePlugin, createResolver, defineNuxtModule } from '@nuxt/kit'
import tailwindcss from '@tailwindcss/vite'

const require = createRequire(import.meta.url)
// Папка src пакета по его главному файлу (exports «.» → ./src/index.ts)
const srcOf = (name: string) => dirname(require.resolve(name))
// Tailwind и Vite ждут пути через «/» и на Windows
const slash = (path: string) => path.replaceAll('\\', '/')

export interface ModuleOptions {
  embedded: boolean
}

// Пакеты ставятся исходниками: при установке из реестра они лежат в node_modules, и без transpile сервер отдаст их
// в Node как есть (.ts и .vue), а Vite попробует собрать их заранее. Только строки: регулярные выражения не идут в optimizeDeps.exclude
const PACKAGES = ['@amaya/nuxt', '@amaya/ui', '@amaya/landing-kit', '@amaya/locales', '@amaya/art', '@amaya/tokens', '@amaya/icons']

export default defineNuxtModule<ModuleOptions>({
  meta: { name: '@amaya/nuxt', configKey: 'amaya' },
  defaults: { embedded: false },
  setup({ embedded }, nuxt) {
    const { resolve } = createResolver(import.meta.url)
    nuxt.options.build.transpile.push(...PACKAGES)
    const ui = srcOf('@amaya/ui')
    const landingKit = srcOf('@amaya/landing-kit')
    const tokens = dirname(require.resolve('@amaya/tokens/fonts.css'))

    // Стили: шрифты, пресет и где искать классы ds:. Tailwind не смотрит в node_modules — источники явно
    const css = addTemplate({
      filename: 'amaya-ds.css',
      write: true,
      getContents: () => [
        '/* Собрано модулем @amaya/nuxt */',
        `@import '${slash(join(tokens, 'fonts.css'))}';`,
        `@import '${slash(join(ui, 'tailwind.css'))}';`,
        `@source '${slash(join(landingKit, 'blocks'))}';`,
        `@source '${slash(nuxt.options.srcDir)}';`,
        ''
      ].join('\n')
    })
    if (!embedded) {
      nuxt.options.css.push(css.dst)
      // Тип — от копии Vite, которую видит @nuxt/kit: pnpm держит несколько вариантов Vite под разные peer-зависимости,
      // и типы плагина Tailwind и Nuxt формально разные. Плагин тот же
      addVitePlugin(tailwindcss() as unknown as Parameters<typeof addVitePlugin>[0])
    }

    // Компоненты без импортов: <DsButton>, <LkPage>
    addComponentsDir({ path: join(ui, 'components'), pattern: 'Ds*.vue', pathPrefix: false })
    addComponentsDir({ path: join(landingKit, 'blocks'), pattern: 'Lk*.vue', pathPrefix: false })
    addImports([
      embedded
        ? { name: 'useDsPage', from: resolve('./runtime/useDsPage') }
        : { name: 'useLocale', from: resolve('./runtime/useLocale') },
      { name: 'track', from: '@amaya/landing-kit' },
      { name: 'imageSet', from: '@amaya/ui' },
      { name: 'imageSetFromFiles', from: '@amaya/ui' }
    ])

    if (!embedded) {
      // Флаги vue-i18n: без них он проверяет их на лету и старый API остаётся в сборке (у нас везде legacy: false)
      nuxt.options.vite.define = {
        ...nuxt.options.vite.define,
        __VUE_I18N_LEGACY_API__: false,
        __VUE_I18N_FULL_INSTALL__: true,
        __INTLIFY_PROD_DEVTOOLS__: false,
        __INTLIFY_DROP_MESSAGE_COMPILER__: false
      }
      addPlugin(resolve('./runtime/i18n'))
      addPlugin(resolve('./runtime/fonts'))
      addPlugin({ src: resolve('./runtime/rive.client'), mode: 'client' })
    }

    // Nuxt вставляет <link rel="prefetch"> на все файлы, которые импортирует сборка: wasm Rive (5 МБ), ролик (6 МБ),
    // png-запасы картинок — на мобильном интернете это лишние мегабайты. Картинки и так есть в HTML (<picture>),
    // wasm, .riv и ролик грузятся по требованию; шрифт первого экрана модуль подгружает сам (runtime/assets).
    // В хосте — только наши файлы: подгрузка его шрифтов и картинок остаётся как была. Ресурсы в манифесте записаны
    // по именам выходных файлов, поэтому свои узнаём при сборке клиента по исходникам. Файл, который нужен и хосту
    // (тот же ролик у его страницы), остаётся как был. Лендинги в хосте лежат в <srcDir>/landings
    const ownAssets = new Set<string>()
    if (embedded) {
      const landings = `${slash(join(nuxt.options.srcDir, 'landings'))}/`
      const packages = /\/node_modules\/.*(?:@amaya|@rive-app|@fontsource-variable)/
      // Исходники Vite пишет относительно своего корня (у Nuxt 4 это app/), поэтому — в абсолютные пути
      let root = nuxt.options.srcDir
      addVitePlugin({
        name: 'amaya:own-assets',
        configResolved(config: { root: string }) {
          root = config.root
        },
        generateBundle(_options: unknown, bundle: Record<string, { type: string, fileName: string, originalFileNames?: string[] }>) {
          for (const output of Object.values(bundle)) {
            const sources = output.type === 'asset' ? (output.originalFileNames ?? []).map(source => slash(resolvePath(root, source))) : []
            if (sources.length && sources.every(source => source.startsWith(landings) || packages.test(source))) ownAssets.add(basename(output.fileName))
          }
        }
      } as unknown as Parameters<typeof addVitePlugin>[0], { server: false })
    }
    nuxt.hook('build:manifest', (manifest) => {
      for (const entry of Object.values(manifest)) {
        if (embedded && !ownAssets.has(basename(entry.file))) continue
        if (!/\.(?:m?js|css)$/.test(entry.file)) {
          entry.prefetch = false
          entry.preload = false
        }
      }
    })

    // Рантайм Rive грузится динамическим импортом из @amaya/ui — Vite собирает его заранее
    nuxt.options.vite.optimizeDeps ??= {}
    nuxt.options.vite.optimizeDeps.include = [...(nuxt.options.vite.optimizeDeps.include ?? []), '@rive-app/webgl2']
  }
})
