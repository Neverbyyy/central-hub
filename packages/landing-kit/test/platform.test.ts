import { afterEach, describe, expect, it, vi } from 'vitest'
import { detectPlatform } from '../src/platform'
import { setTrackHandler, track } from '../src/track'

const UA = {
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  ipadOld: 'Mozilla/5.0 (iPad; CPU OS 12_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1 Mobile/15E148 Safari/604.1',
  mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  android: 'Mozilla/5.0 (Linux; Android 13; SM-A135F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36',
  windows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
}

describe('платформа посетителя', () => {
  it('iPhone и старый iPad — ios, Android — android, Windows — other', () => {
    expect(detectPlatform({ userAgent: UA.iphone })).toBe('ios')
    expect(detectPlatform({ userAgent: UA.ipadOld })).toBe('ios')
    expect(detectPlatform({ userAgent: UA.android })).toBe('android')
    expect(detectPlatform({ userAgent: UA.windows, platform: 'Win32', maxTouchPoints: 0 })).toBe('other')
  })

  it('iPadOS представляется Mac — выдаёт сенсорный экран', () => {
    expect(detectPlatform({ userAgent: UA.mac, platform: 'MacIntel', maxTouchPoints: 5 })).toBe('ios')
    expect(detectPlatform({ userAgent: UA.mac, platform: 'MacIntel', maxTouchPoints: 0 })).toBe('other')
  })
})

describe('track — одна функция для всех нажатий', () => {
  afterEach(() => {
    setTrackHandler()
    vi.restoreAllMocks()
  })

  it('по умолчанию пишет в консоль', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    track('cta_click', { source: 'hero' })
    expect(info).toHaveBeenCalledWith('[track]', 'cta_click', { source: 'hero' })
  })

  it('setTrackHandler подключает аналитику, без аргумента — снова консоль', () => {
    const sent: unknown[] = []
    setTrackHandler((event, props) => sent.push([event, props]))
    track('store_click', { store: 'app-store' })
    expect(sent).toEqual([['store_click', { store: 'app-store' }]])
    setTrackHandler()
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    track('video_play')
    expect(info).toHaveBeenCalledWith('[track]', 'video_play', {})
  })
})
