import { describe, expect, it } from 'vitest'
import { discountPercent, parsePrice, perMonth, perWeek } from '../src'

describe('parsePrice', () => {
  it('сумма и знаки после запятой в разных форматах сторов', () => {
    expect(parsePrice('$49.99')).toMatchObject({ amount: 49.99, decimals: 2 })
    expect(parsePrice('49,99 €')).toMatchObject({ amount: 49.99, decimals: 2 })
    expect(parsePrice('1.299,00 €')).toMatchObject({ amount: 1299, decimals: 2 })
    expect(parsePrice('1 299,00 ₽')).toMatchObject({ amount: 1299, decimals: 2 })
    expect(parsePrice('¥6,000')).toMatchObject({ amount: 6000, decimals: 0 })
    expect(parsePrice('R$ 49,90')).toMatchObject({ amount: 49.9, decimals: 2 })
    expect(parsePrice('٤٩٫٩٩ US$')).toMatchObject({ amount: 49.99, decimals: 2 })
  })

  it('нет цены — null: продукт не пришёл', () => {
    expect(parsePrice('$—')).toBeNull()
    expect(parsePrice('')).toBeNull()
    expect(parsePrice(null)).toBeNull()
  })

  it('format пишет другую сумму в том же виде', () => {
    expect(parsePrice('49,99 €')!.format(0.96)).toBe('0,96 €')
    expect(parsePrice('1.299,00 €')!.format(24.98)).toBe('24,98 €')
    expect(parsePrice('1 299,00 ₽')!.format(1234.5)).toBe('1 234,50 ₽')
    expect(parsePrice('¥6,000')!.format(115.38)).toBe('¥115')
    expect(parsePrice('٤٩٫٩٩ US$')!.format(0.96)).toBe('٠٫٩٦ US$')
  })
})

describe('perWeek', () => {
  // Те же суммы, что у InApp countWeekPriceFromYearly на ценах из пресетов Cars 2 и Farm
  it.each([
    ['$49.99', '$0.96'],
    ['$39.99', '$0.77'],
    ['$34.99', '$0.67'],
    ['$29.99', '$0.58'],
    ['$24.99', '$0.48'],
    ['$99.99', '$1.92']
  ])('год %s → %s в неделю, как в InApp', (year, week) => {
    expect(perWeek(year, 'year')).toBe(week)
  })

  it('нули после запятой не теряются — у InApp было бы «$1»', () => {
    expect(perWeek('$52.00', 'year')).toBe('$1.00')
  })

  it('месяц и неделя', () => {
    expect(perWeek('$19.99', 'month')).toBe('$4.61')
    expect(perWeek('$9.99', 'week')).toBe('$9.99')
    expect(perWeek('$—', 'year')).toBeNull()
  })
})

describe('perMonth и discountPercent', () => {
  it('цена за месяц из годовой', () => {
    expect(perMonth('$59.99', 'year')).toBe('$5.00')
  })

  it('скидка годового тарифа к недельному — целые проценты вниз', () => {
    expect(discountPercent({ price: '$9.99', period: 'week' }, { price: '$49.99', period: 'year' })).toBe(90)
    expect(discountPercent({ price: '$9.99', period: 'week' }, { price: '$9.99', period: 'week' })).toBeNull()
    expect(discountPercent({ price: '$—', period: 'week' }, { price: '$49.99', period: 'year' })).toBeNull()
  })
})
