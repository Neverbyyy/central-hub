// Картинки по конвенции InApp: на каждое имя 12 файлов — <имя>-{small,medium,large}{,@2x}.{png,webp}.
// small — по умолчанию, medium — от 844 px, large — от 1024 px (те же брейкпоинты, что у токенов)

export interface DsImageVariant {
  png?: string
  png2x?: string
  webp?: string
  webp2x?: string
}

export interface DsImageSet {
  small: DsImageVariant
  medium?: DsImageVariant
  large?: DsImageVariant
}

// large — как размеры iPad у токенов: и ширина, и высота (широкое низкое окно берёт арт medium)
export const IMAGE_MEDIA = {
  large: '(min-width: 1024px) and (min-height: 600px)',
  medium: '(min-width: 844px)'
} as const

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
  const variant = (size: 'small' | 'medium' | 'large'): DsImageVariant | undefined => {
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
  return { small, medium: variant('medium'), large: variant('large') }
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
  for (const size of ['large', 'medium'] as const) {
    const variant = set[size]
    if (!variant) continue
    if (variant.webp) sources.push({ key: `${size}-webp`, media: IMAGE_MEDIA[size], type: 'image/webp', srcset: srcset(variant.webp, variant.webp2x) })
    if (variant.png) sources.push({ key: `${size}-png`, media: IMAGE_MEDIA[size], type: 'image/png', srcset: srcset(variant.png, variant.png2x) })
  }
  if (set.small.webp) sources.push({ key: 'small-webp', type: 'image/webp', srcset: srcset(set.small.webp, set.small.webp2x) })
  return sources
}
