// Общая логика лендинга: платформа, ссылки в сторы с UTM и главная кнопка.
// Страница собирается заранее (prerender), поэтому платформу и UTM видно только в браузере: до гидрации ссылки
// значков — без меток, после — с метками из адреса. Кнопка: iPhone и iPad — App Store, Android — Google Play,
// компьютер — прокрутка к значкам сторов (там обе ссылки)
import { inject, onBeforeUnmount, onMounted, provide, ref, type InjectionKey, type Ref } from 'vue'
import type { LandingConfig } from './config'
import { detectPlatform, type Platform } from './platform'
import { storeLinks, type StoreUrls } from './store'
import { track } from './track'

export type StoreName = 'app-store' | 'google-play'

export interface Landing {
  config: LandingConfig
  platform: Ref<Platform>
  links: Ref<StoreUrls>
  // id блока со значками сторов — к нему прокручивает кнопка на компьютере
  storesId: string
  // Картинка первого экрана загрузилась: блоки ниже него начинают свои
  heroLoaded: Ref<boolean>
  markHeroLoaded: () => void
  cta: (source: string) => void
  storeClick: (store: StoreName, source: string) => void
}

const KEY: InjectionKey<Landing> = Symbol('landing')

// Сколько картинки ниже первого экрана ждут его картинку: событие могло потеряться, а первого экрана может не быть
const HERO_WAIT = 3000

/**
 * Строка запроса, с которой пришёл человек. На собранной заранее странице роутер Nuxt при гидрации на время
 * заменяет адрес на путь без query (history.replaceState) и возвращает его уже после onMounted — поэтому
 * запасной источник: адрес загрузки документа из Navigation Timing, его replaceState не трогает.
 */
function currentSearch(): string {
  if (location.search) return location.search
  const navigation = performance.getEntriesByType?.('navigation')[0] as PerformanceNavigationTiming | undefined
  try {
    return navigation ? new URL(navigation.name).search : ''
  } catch {
    return ''
  }
}

/** Создаёт логику страницы и отдаёт её блокам. Вызывается в LkPage. */
export function provideLanding(config: LandingConfig): Landing {
  const platform = ref<Platform>('other')
  const links = ref<StoreUrls>({ ...config.stores })
  const storesId = `${config.id}-stores`

  // Картинки преимуществ и постер не делят сеть с картинкой первого экрана: на мобильном интернете они отодвигают LCP.
  // Отложенный loading="lazy" здесь не помогает: браузер берёт всё в большом запасе вокруг экрана
  const heroLoaded = ref(false)
  const markHeroLoaded = () => {
    heroLoaded.value = true
  }
  let heroTimer: ReturnType<typeof setTimeout> | undefined
  onBeforeUnmount(() => clearTimeout(heroTimer))

  onMounted(() => {
    platform.value = detectPlatform(navigator)
    links.value = storeLinks(config.stores, currentSearch())
    track('landing_open', { landing: config.id, platform: platform.value })
    heroTimer = setTimeout(markHeroLoaded, HERO_WAIT)
  })

  function cta(source: string) {
    // Метки — ещё раз на момент нажатия: к этому времени адрес точно на месте
    links.value = storeLinks(config.stores, currentSearch())
    track('cta_click', { landing: config.id, source, platform: platform.value })
    if (platform.value === 'ios') location.href = links.value.appStore
    else if (platform.value === 'android') location.href = links.value.googlePlay
    else {
      const stores = document.getElementById(storesId)
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      stores?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' })
      stores?.querySelector<HTMLElement>('a')?.focus({ preventScroll: true })
    }
  }

  function storeClick(store: StoreName, source: string) {
    track('store_click', { landing: config.id, store, source })
  }

  const landing: Landing = { config, platform, links, storesId, heroLoaded, markHeroLoaded, cta, storeClick }
  provide(KEY, landing)
  return landing
}

/** Логика страницы в блоке. Блок вне LkPage — ошибка: значит, его вставили мимо конфига. */
export function useLanding(): Landing {
  const landing = inject(KEY)
  if (!landing) throw new Error('Блок лендинга вне LkPage')
  return landing
}
