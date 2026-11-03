// Правила дизайн-системы одним набором — для eslint.config.mjs пакетов и для apps/landings (у него свой конфиг Nuxt)
import ds from './ds.mjs'

const NO_TEXT = 'Текст в шаблоне — только ключом из сервиса: {{ t(\'web.lp_cars2.hero.title\') }} или проп от экрана'

/** Всё, что уходит в продукты: компоненты, шаблоны, блоки, экраны — без текста в шаблоне, классы ds:, только токены. */
export const designSystemRules = {
  plugins: { ds },
  rules: {
    'ds/class-prefix': 'error',
    'ds/no-raw-values': 'error',
    'vue/no-bare-strings-in-template': ['error', { attributes: { '/.+/': ['title', 'aria-label', 'aria-placeholder', 'aria-roledescription', 'aria-valuetext', 'placeholder'], 'img': ['alt'] } }]
  }
}

/** Блоки и экраны собираются из компонентов: картинка — DsImage, видео — DsVideo, анимация — DsRive. */
export const screenRules = {
  rules: {
    'vue/no-restricted-html-elements': ['error',
      { element: 'img', message: 'Картинка — <DsImage :set="imageSetFromFiles(art, \'./art/имя\')">: конвенция 12 файлов, webp, место до загрузки' },
      { element: 'picture', message: 'Картинка — <DsImage>' },
      { element: 'video', message: 'Видео — <DsVideo>: постер, ролик качается только по нажатию' },
      { element: 'canvas', message: 'Анимация — <DsRive>' }
    ]
  }
}

export { NO_TEXT }
