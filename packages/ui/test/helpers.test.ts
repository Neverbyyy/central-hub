import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTapGuard } from '../src/composables/useTapGuard'
import { imageSet, imageSources, srcset } from '../src/image'

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
      'large-webp (min-width: 1024px)',
      'large-png (min-width: 1024px)',
      'medium-webp (min-width: 844px)',
      'medium-png (min-width: 844px)',
      'small-webp —'
    ])
  })

  it('набор только из small — один источник webp', () => {
    expect(imageSources({ small: { webp: '/a.webp', png: '/a.png' } }).map(s => s.key)).toEqual(['small-webp'])
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
