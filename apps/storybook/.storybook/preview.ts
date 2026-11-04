import { languageLabel, locales, messages, pluralRules } from '@amaya/locales'
import '@amaya/tokens/fonts.css'
import { configureRive, DS_THEMES, DsRoot } from '@amaya/ui'
import { setup, type Decorator, type Preview } from '@storybook/vue3-vite'
import riveWasm from '@rive-app/webgl2/rive.wasm?url'
import riveWasmFallback from '@rive-app/webgl2/rive_fallback.wasm?url'
import { computed } from 'vue'
import { createI18n } from 'vue-i18n'
import { storyGlobals } from '@amaya/ui/stories'
import './preview.css'

// wasm Rive — со своего адреса, а не с unpkg (так по умолчанию делает рантайм): без внешней сети и без лишнего запроса
configureRive({ wasmUrl: riveWasm, wasmFallbackUrl: riveWasmFallback })

// Тексты — из сервиса, через `pnpm l10n pull` (@amaya/locales). Компоненты сами не переводят: тексты им передаёт история
const i18n = createI18n({ legacy: false, locale: 'en', fallbackLocale: 'en', messages, pluralRules, missingWarn: false, fallbackWarn: false })
setup((app) => {
  app.use(i18n)
})

// Размеры экрана, под которые делаются макеты: телефон в альбомной (667 и 844 — брейкпоинты токенов) и в портретной,
// iPad, десктоп для лендингов
const VIEWPORTS = {
  phoneLandscapeS: { name: 'Телефон, альбом 667×375', styles: { width: '667px', height: '375px' }, type: 'mobile' },
  phoneLandscapeM: { name: 'Телефон, альбом 844×390', styles: { width: '844px', height: '390px' }, type: 'mobile' },
  phonePortraitS: { name: 'Телефон, портрет 375×667', styles: { width: '375px', height: '667px' }, type: 'mobile' },
  phonePortraitM: { name: 'Телефон, портрет 390×844', styles: { width: '390px', height: '844px' }, type: 'mobile' },
  ipadLandscape: { name: 'iPad, альбом 1024×768', styles: { width: '1024px', height: '768px' }, type: 'tablet' },
  ipadPortrait: { name: 'iPad, портрет 768×1024', styles: { width: '768px', height: '1024px' }, type: 'tablet' },
  desktop: { name: 'Десктоп 1440×900', styles: { width: '1440px', height: '900px' }, type: 'desktop' }
}

/**
 * Каждая история — внутри DsRoot выбранной темы и языка; «все три рядом» — три колонки с одной историей.
 * parameters.themes: false — история сама показывает все темы (страницы токенов): один корень base.
 */
const withDsRoot: Decorator = (story, context) => {
  // Вызывается и при каждой смене переключателя — обновляем общее реактивное состояние (@amaya/ui/stories)
  storyGlobals.theme = String(context.globals.theme ?? 'base')
  storyGlobals.locale = String(context.globals.locale ?? 'en')
  storyGlobals.screen = context.globals.screen === 'closed' ? 'closed' : 'open'
  storyGlobals.purchasing = context.globals.purchasing === 'pending'
  i18n.global.locale.value = storyGlobals.locale
  const showsAllThemes = context.parameters.themes === false

  return {
    components: { story, DsRoot },
    setup() {
      const themes = computed(() => showsAllThemes ? ['base'] : storyGlobals.theme === 'all' ? [...DS_THEMES] : [storyGlobals.theme])
      return { themes, globals: storyGlobals }
    },
    template: `
      <div :class="['sb-themes', { 'sb-themes--all': themes.length > 1 }]">
        <DsRoot
          v-for="name in themes"
          :key="name"
          :theme="name"
          :lang="globals.locale"
          class="sb-theme"
          :data-sb-label="themes.length > 1 ? name : undefined"
        >
          <story />
        </DsRoot>
      </div>
    `
  }
}

const preview: Preview = {
  decorators: [withDsRoot],
  globalTypes: {
    theme: {
      description: 'Тема дизайн-системы',
      toolbar: {
        title: 'Тема',
        icon: 'paintbrush',
        dynamicTitle: true,
        items: [
          { value: 'base', title: 'base' },
          { value: 'cars2', title: 'Cars 2' },
          { value: 'farm', title: 'Farm' },
          { value: 'all', title: 'Все три рядом' }
        ]
      }
    },
    locale: {
      description: 'Язык текстов из сервиса локализации',
      toolbar: {
        title: 'Язык',
        icon: 'globe',
        dynamicTitle: true,
        items: locales.map(code => ({ value: code, title: languageLabel(code) }))
      }
    },
    screen: {
      description: 'Экран открыт или закрыт',
      toolbar: {
        title: 'Экран',
        icon: 'eye',
        dynamicTitle: true,
        items: [
          { value: 'open', title: 'Экран открыт' },
          { value: 'closed', title: 'Экран закрыт' }
        ]
      }
    },
    purchasing: {
      description: 'Идёт покупка: кнопка с загрузкой, остальное заблокировано',
      toolbar: {
        title: 'Покупка',
        icon: 'credit',
        dynamicTitle: true,
        items: [
          { value: 'idle', title: 'Покупки нет' },
          { value: 'pending', title: 'Идёт покупка' }
        ]
      }
    }
  },
  initialGlobals: {
    theme: 'base',
    locale: 'en',
    screen: 'open',
    purchasing: 'idle'
  },
  parameters: {
    layout: 'fullscreen',
    viewport: { options: VIEWPORTS },
    controls: { expanded: true },
    // Сначала целые пейволлы, потом общее для Cars 2 и Farm, потом то, что есть только у одной игры
    options: {
      storySort: {
        order: [
          'Пейволлы', ['Cars 2', 'Farm · On start', 'Farm · On click'],
          'Онбординги', ['Farm'],
          'Лендинги', ['Cars 2'],
          'Общее', ['Кнопка', 'Крестик', 'Выбор тарифа', 'Текст', 'Плашки и списки', 'Картинка', 'Подгонка по высоте'],
          'Cars 2', ['Заголовок с обводкой', 'Главная карточка', 'Попап тарифов', 'Карусель наборов'],
          'Farm', ['Тумблер триала', 'Слайды Amaya Plus', 'Документы'],
          'Блоки лендинга', ['FAQ', 'Звёзды', 'Видео и сторы'],
          'Анимации', ['Rive'],
          'Токены'
        ]
      }
    }
  }
}

export default preview
