import { describe, expect, it } from 'vitest'
import { escapeLike } from '../src'

describe('escapeLike', () => {
  it('_ и % — буквально, остальное как есть', () => {
    expect(escapeLike('legacy.pages_hub.')).toBe(String.raw`legacy.pages\_hub.`)
    expect(escapeLike('100%')).toBe(String.raw`100\%`)
    expect(escapeLike(String.raw`a\b`)).toBe(String.raw`a\\b`)
    expect(escapeLike('app.cars2.')).toBe('app.cars2.')
  })
})
