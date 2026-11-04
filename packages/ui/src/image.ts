// Размер, который повторяет меньший, не нужен: без него браузер возьмёт меньший.
// Картинки по конвенции InApp: на каждое имя 12 файлов — <имя>-{small,medium,large}{,@2x}.{png,webp}.
// small — по умолчанию, medium — от 844 px, large — iPad: от 844 px и от 600 px в высоту (как у токенов).
// Лендингу (портретный телефон и планшет) нужен ещё wide — от 640 px, брейкпоинт раскладки ds:wide:;
// его берёт только imageSetFromFiles, если файлы -wide есть: арт телефона и планшета обрезан по-разному
import breakpoints from '@amaya/tokens/breakpoints.json'

export interface DsImageVariant {
  png?: string
  png2x?: string
  webp?: string
  webp2x?: string
}

export interface DsImageSet {
  small: DsImageVariant
  wide?: DsImageVariant
  medium?: DsImageVariant
  large?: DsImageVariant
}

// Условия выбора размера — те же брейкпоинты, что у токенов (@amaya/tokens/breakpoints.json). large — и ширина,
// и высота: широкое низкое окно берёт арт medium
const media = (name: string) => {
  const list: { name: string, min: number, minHeight?: number }[] = [...breakpoints.sizes, ...breakpoints.layout]
  const { min, minHeight } = list.find(item => item.name === name)!
  return `(min-width: ${min}px)${minHeight ? ` and (min-height: ${minHeight}px)` : ''}`
}

export const IMAGE_MEDIA = { large: media('large'), medium: media('medium'), wide: media('wide') }

/** 12 адресов по конвенции: imageSet('/images/cars2/art') → /images/cars2/art-small.png, …-large@2x.webp. */
export function imageSet(base: string): DsImageSet {
  const variant = (size: 'small' | 'medium' | 'large'): DsImageVariant => ({
    png: `${base}-${size}.png`,
    png2x: `${base}-${size}@2x.png`,
    webp: `${base}-${size}.webp`,
    webp2x: `${base}-${size}@2x.webp`
  })
  return { small: variant('small'), medium: variant('medium'), large: variant('large') }
}

/**
 * Набор из найденных файлов: экран держит арт в своей папке и берёт адреса через import.meta.glob(…, { query: '?url' }),
 * адреса получаются с хешем сборки. imageSetFromFiles(files, './art/front') → front-small.png, …-large@2x.webp.
 * Без файла small (png или webp) — ошибка: значит, опечатка в имени или картинку забыли положить.
 */
export function imageSetFromFiles(files: Record<string, string>, base: string): DsImageSet {
  const variant = (size: 'small' | 'wide' | 'medium' | 'large'): DsImageVariant | undefined => {
    const found: DsImageVariant = {
      png: files[`${base}-${size}.png`],
      png2x: files[`${base}-${size}@2x.png`],
      webp: files[`${base}-${size}.webp`],
      webp2x: files[`${base}-${size}@2x.webp`]
    }
    return found.png || found.webp ? found : undefined
  }
  const small = variant('small')
  if (!small) throw new Error(`Нет картинки ${base}-small.png или .webp`)
  const set: DsImageSet = { small, medium: variant('medium'), large: variant('large') }
  const wide = variant('wide')
  if (wide) set.wide = wide
  return set
}

/** srcset из 1x и 2x: «a.webp 1x, a@2x.webp 2x»; пустая строка — нет ни одного. */
export function srcset(x1?: string, x2?: string): string {
  return [x1 && `${x1} 1x`, x2 && `${x2} 2x`].filter(Boolean).join(', ')
}

export interface DsImageSource {
  key: string
  media?: string
  type: 'image/webp' | 'image/png'
  srcset: string
}

/**
 * Источники <picture> по набору: large и medium — по media, у каждого webp и png; small — webp,
 * а png small — сам <img> (его берут браузеры без webp). Порядок важен: браузер берёт первый подходящий.
 */
export function imageSources(set: DsImageSet): DsImageSource[] {
  const sources: DsImageSource[] = []
  for (const size of ['large', 'medium', 'wide'] as const) {
    const variant = set[size]
    if (!variant) continue
    if (variant.webp) sources.push({ key: `${size}-webp`, media: IMAGE_MEDIA[size], type: 'image/webp', srcset: srcset(variant.webp, variant.webp2x) })
    if (variant.png) sources.push({ key: `${size}-png`, media: IMAGE_MEDIA[size], type: 'image/png', srcset: srcset(variant.png, variant.png2x) })
  }
  if (set.small.webp) sources.push({ key: 'small-webp', type: 'image/webp', srcset: srcset(set.small.webp, set.small.webp2x) })
  return sources
}
