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
    // Живой арт поверх картинки, появляется после загрузки страницы. cover — во весь арт (картинка — постер),
    // corner — небольшой элемент в верхнем углу поверх картинки. Только если он есть в макете
    rive?: { src: string, artboard?: string, stateMachine?: string, layout?: 'cover' | 'corner' }
    title: string
    text: string
    note: string
    // Две цветные плашки-преимущества
    advantages: [string, string]
  }
  // Текст главной кнопки
  cta: string
  features: LandingFeature[]
  video?: { src: string, poster: DsImageSet, label: string }
  // Отзывы, видео и FAQ — по наличию: у лендинга без них блок не рисуется
  reviews?: { items: LandingReview[], ratingLabel: string }
  faq?: { title: string, items: LandingFaqItem[] }
  footer: { copyright: string, rights: string, links: LandingLink[] }
  // Закреплённая кнопка на телефоне, когда первый экран ушёл из вида
  stickyCta?: boolean
}
