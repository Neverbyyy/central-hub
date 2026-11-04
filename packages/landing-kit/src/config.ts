// Конфиг лендинга: новая страница — это конфиг, а не вёрстка. Тексты — ключи сервиса (страница переводит их сама),
// арт — наборы картинок по конвенции (imageSetFromFiles), адреса файлов — из сборки (?url)
import type { DsImageSet, DsTheme } from '@amaya/ui'
import type { StoreUrls } from './store'

export interface LandingFeature {
  art: DsImageSet
  title: string
  text: string
}

export interface LandingReview {
  text: string
  author: string
  rating: number
}

export interface LandingFaqItem {
  id: string
  question: string
  answer: string
}

export interface LandingLink {
  label: string
  href: string
}

/** Дорожная раскладка: своя подача поверх тех же данных лендинга. Есть в конфиге — LkPage рисует LkRoadLayout. */
export interface LandingRoad {
  // Живая сцена первого экрана: анимации idle играют постоянно, постер — config.hero.art, кадр из той же позы
  scene: { src: string, artboard: string, idle: string[] }
  wash: { art: DsImageSet, ratio: string, title: string, text: string, cleanTitle: string, done: string, again: string, label: string }
  worlds: { title: string, text: string, items: DsImageSet[] }
  featuresTitle: string
  videoTitle: string
  reviewsTitle: string
  finish: {
    title: string
    text: string
    balloons: { src: string, artboard: string, poster: DsImageSet, ratio: string }
  }
}

export interface LandingConfig {
  // Путь лендинга: /cars2
  id: string
  theme: DsTheme
  stores: StoreUrls
  // Значки сторов: файлы и подписи для скринридера
  badges: { appStore: string, googlePlay: string, appStoreLabel: string, googlePlayLabel: string }
  meta: { title: string, description: string }
  header: { logo: string, logoLabel: string }
  hero: {
    art: DsImageSet
    // Живой арт во весь арт поверх картинки (она — постер), появляется после загрузки страницы. Только если он есть в макете
    rive?: { src: string, artboard?: string, stateMachine?: string }
    title: string
    text: string
    note: string
    // Две цветные плашки-преимущества
    advantages: [string, string]
  }
  // Текст главной кнопки; нет — кнопок нет, вход в стор только значками
  cta?: string
  features: LandingFeature[]
  video?: { src: string, poster: DsImageSet, label: string }
  // Отзывы, видео и FAQ — по наличию: у лендинга без них блок не рисуется
  reviews?: { items: LandingReview[], ratingLabel: string }
  faq?: { title: string, items: LandingFaqItem[] }
  footer: { copyright: string, rights: string, links: LandingLink[] }
  // Закреплённая кнопка на телефоне, когда первый экран ушёл из вида
  stickyCta?: boolean
  road?: LandingRoad
}
