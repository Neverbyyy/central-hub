// Nuxt-модуль дизайн-системы: modules: ['@amaya/nuxt'] — и в приложении есть всё для лендинга:
//   - Tailwind 4 с пресетом ds: (@amaya/ui/tailwind.css) и источниками классов пакетов и самого приложения;
//   - шрифты Nunito и Open Sans (с кириллицей, из сборки) и preload Nunito для первого экрана;
//   - компоненты Ds* и блоки Lk* без импортов; track, imageSet, imageSetFromFiles — автоимпортом;
//   - vue-i18n с текстами из сервиса (@amaya/locales, только утверждённые) и формами множественного числа;
//     тексты — только языка страницы: await useLocale(lang);
//   - Rive: wasm со своего адреса, а не с unpkg.
// Пути пакетов модуль находит сам: у приложения в зависимостях только @amaya/nuxt
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { addComponentsDir, addImports, addPlugin, addTemplate, addVitePlugin, createResolver, defineNuxtModule } from '@nuxt/kit'
import tailwindcss from '@tailwindcss/vite'

const require = createRequire(import.meta.url)
// Папка src пакета по его главному файлу (exports «.» → ./src/index.ts)
const srcOf = (name: string) => dirname(require.resolve(name))
// Tailwind и Vite ждут пути через «/» и на Windows
const slash = (path: string) => path.replaceAll('\\', '/')

export default defineNuxtModule({
  meta: { name: '@amaya/nuxt', configKey: 'amaya' },
  setup(_options, nuxt) {
    const { resolve } = createResolver(import.meta.url)
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
    nuxt.options.css.push(css.dst)
    // Тип — от копии Vite, которую видит @nuxt/kit: pnpm держит несколько вариантов Vite под разные peer-зависимости,
    // и типы плагина Tailwind и Nuxt формально разные. Плагин тот же
    addVitePlugin(tailwindcss() as unknown as Parameters<typeof addVitePlugin>[0])

    // Компоненты без импортов: <DsButton>, <LkPage>
    addComponentsDir({ path: join(ui, 'components'), pattern: 'Ds*.vue', pathPrefix: false })
    addComponentsDir({ path: join(landingKit, 'blocks'), pattern: 'Lk*.vue', pathPrefix: false })
    addImports([
      { name: 'useLocale', from: resolve('./runtime/useLocale') },
      { name: 'track', from: '@amaya/landing-kit' },
      { name: 'imageSet', from: '@amaya/ui' },
      { name: 'imageSetFromFiles', from: '@amaya/ui' }
    ])

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

    // Nuxt вставляет <link rel="prefetch"> на все файлы, которые импортирует сборка: wasm Rive (5 МБ), ролик (6 МБ),
    // png-запасы картинок — на мобильном интернете это лишние мегабайты. Картинки и так есть в HTML (<picture>),
    // wasm, .riv и ролик грузятся по требованию; шрифт первого экрана модуль подгружает сам (runtime/fonts)
    nuxt.hook('build:manifest', (manifest) => {
      for (const entry of Object.values(manifest)) {
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
