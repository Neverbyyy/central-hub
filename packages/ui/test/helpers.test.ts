import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTapGuard } from '../src/composables/useTapGuard'
import { imageSet, imageSetFromFiles, imageSources, srcset } from '../src/image'

describe('картинки по конвенции', () => {
  it('imageSet: 12 адресов — small/medium/large × 1x/2x × png/webp', () => {
    const set = imageSet('/img/cars2/art')
    expect(set.small).toEqual({ png: '/img/cars2/art-small.png', png2x: '/img/cars2/art-small@2x.png', webp: '/img/cars2/art-small.webp', webp2x: '/img/cars2/art-small@2x.webp' })
    expect(set.large?.webp2x).toBe('/img/cars2/art-large@2x.webp')
    expect(Object.values(set).flatMap(v => Object.values(v!))).toHaveLength(12)
  })

  it('srcset из того, что есть', () => {
    expect(srcset('a.webp', 'a@2x.webp')).toBe('a.webp 1x, a@2x.webp 2x')
    expect(srcset('a.png')).toBe('a.png 1x')
    expect(srcset()).toBe('')
  })

  it('источники <picture>: сначала large, потом medium, у каждого webp раньше png; small png — у <img>', () => {
    const sources = imageSources(imageSet('/a'))
    expect(sources.map(s => `${s.key} ${s.media ?? '—'}`)).toEqual([
      'large-webp (min-width: 844px) and (min-height: 600px)',
      'large-png (min-width: 844px) and (min-height: 600px)',
      'medium-webp (min-width: 844px)',
      'medium-png (min-width: 844px)',
      'small-webp —'
    ])
  })

  it('набор только из small — один источник webp', () => {
    expect(imageSources({ small: { webp: '/a.webp', png: '/a.png' } }).map(s => s.key)).toEqual(['small-webp'])
  })

  it('wide (лендинг, от 640 px): берётся из файлов -wide и идёт перед small', () => {
    const files = {
      './art/hero-small.webp': 's.webp',
      './art/hero-small@2x.webp': 's2.webp',
      './art/hero-small.png': 's.png',
      './art/hero-wide.webp': 'w.webp',
      './art/hero-wide@2x.webp': 'w2.webp'
    }
    const set = imageSetFromFiles(files, './art/hero')
    expect(set.wide).toEqual({ webp: 'w.webp', webp2x: 'w2.webp' })
    expect(set.medium).toBeUndefined()
    expect(imageSources(set).map(s => `${s.key} ${s.media ?? '—'} ${s.srcset}`)).toEqual([
      'wide-webp (min-width: 640px) w.webp 1x, w2.webp 2x',
      'small-webp — s.webp 1x, s2.webp 2x'
    ])
    // Без файлов -wide набора wide нет — у пейволлов всё как раньше
    expect('wide' in imageSetFromFiles({ './a-small.png': 'a.png' }, './a')).toBe(false)
  })
})

describe('useTapGuard — двойной тап не срабатывает дважды', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('второе нажатие в течение 800 мс пропускается, после — снова работает', () => {
    const guard = useTapGuard()
    const action = vi.fn()
    expect(guard(action)).toBe(true)
    vi.advanceTimersByTime(300)
    expect(guard(action)).toBe(false)
    vi.advanceTimersByTime(500)
    expect(guard(action)).toBe(true)
    expect(action).toHaveBeenCalledTimes(2)
  })

  it('у каждого компонента свой счётчик', () => {
    const a = useTapGuard()
    const b = useTapGuard()
    const action = vi.fn()
    a(action)
    b(action)
    expect(action).toHaveBeenCalledTimes(2)
  })
})
