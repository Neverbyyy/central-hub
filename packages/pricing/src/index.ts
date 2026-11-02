// Цены пейволлов. Стор присылает цену готовой строкой на языке и в валюте пользователя: «$49.99», «49,99 €»,
// «1 299,00 ₽», «٤٩٫٩٩ US$» — числа отдельно нет. Цена «в неделю» считается из этой строки и пишется в том же виде:
// та же валюта на том же месте, те же разделители и цифры. Логика как у InApp (plugins/countWeekPriceFromYearly):
// год / 52, округление до копеек; но число знаков после запятой — как у исходной цены («$1.00», а не «$1»).

export type Period = 'week' | 'month' | 'year'

// Сколько недель в периоде: год — 52 недели, как в InApp
const WEEKS: Record<Period, number> = { week: 1, month: 52 / 12, year: 52 }

export interface StorePrice {
  // Сумма числом: 49.99
  amount: number
  // Знаков после запятой у исходной строки: 2 у «$49.99», 0 у «¥6,000»
  decimals: number
  /** Другая сумма в том же виде, что исходная строка: format(0.96) у «49,99 €» → «0,96 €». */
  format: (amount: number) => string
}

// Арабские цифры и разделители — их присылают сторы для арабских регионов
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩'
const ARABIC_DECIMAL = '٫'

const toLatin = (text: string) => text.replace(/[٠-٩]/g, digit => String(ARABIC_DIGITS.indexOf(digit)))
const toArabic = (text: string) => text.replace(/[0-9]/g, digit => ARABIC_DIGITS[Number(digit)]!)

// Число внутри строки: цифры с разделителями групп и дробной части (точка, запятая, пробелы, апостроф, арабские)
const NUMBER = /[0-9٠-٩](?:[0-9٠-٩.,'’\u00A0\u202F ٫٬]*[0-9٠-٩])?/
const SEPARATOR = /[.,'’\u00A0\u202F ٫٬]/g

/**
 * Разбирает строку цены из стора. null — цены нет («$—», пусто): продукт не пришёл, экран его не показывает.
 * Дробная часть — после последнего разделителя, если за ним не ровно три цифры («1,299» — это тысяча двести).
 */
export function parsePrice(text: string | null | undefined): StorePrice | null {
  if (!text) return null
  const match = NUMBER.exec(text)
  if (!match) return null
  const raw = match[0]
  const separators = [...raw.matchAll(SEPARATOR)].map(m => ({ char: m[0], index: m.index! }))

  // Не .at(-1): его нет в вебвью iOS до 15.4
  const last = separators[separators.length - 1]
  const tail = last ? raw.length - last.index - 1 : 0
  const isDecimal = !!last && (last.char === ARABIC_DECIMAL || (/[.,]/.test(last.char) && tail !== 3))
  const decimalSep = isDecimal ? last!.char : undefined
  const decimals = isDecimal ? tail : 0
  const intRaw = isDecimal ? raw.slice(0, last!.index) : raw
  const groupSep = separators.find(s => s.index < intRaw.length)?.char

  const digits = (part: string) => toLatin(part).replace(/[^0-9]/g, '')
  const amount = Number(`${digits(intRaw) || '0'}.${isDecimal ? digits(raw.slice(last!.index + 1)) : '0'}`)
  const arabic = /[٠-٩]/.test(raw)

  const format = (value: number) => {
    const factor = 10 ** decimals
    const rounded = Math.round((value + Number.EPSILON) * factor) / factor
    const [int = '0', frac] = rounded.toFixed(decimals).split('.')
    // Группы по три цифры — только если они были в исходной строке
    const grouped = groupSep ? int.replace(/\B(?=(\d{3})+(?!\d))/g, groupSep) : int
    let number = frac ? `${grouped}${decimalSep ?? '.'}${frac}` : grouped
    if (arabic) number = toArabic(number)
    return text.slice(0, match.index) + number + text.slice(match.index + raw.length)
  }

  return { amount, decimals, format }
}

/** Цена за неделю из цены за период, в том же виде: perWeek('$49.99', 'year') → '$0.96'. null — цены нет. */
export function perWeek(price: string | null | undefined, period: Period): string | null {
  const parsed = parsePrice(price)
  return parsed ? parsed.format(parsed.amount / WEEKS[period]) : null
}

/** Цена за месяц из цены за год: perMonth('$59.99', 'year') → '$5.00'. */
export function perMonth(price: string | null | undefined, period: Exclude<Period, 'week'>): string | null {
  const parsed = parsePrice(price)
  return parsed ? parsed.format(period === 'year' ? parsed.amount / 12 : parsed.amount) : null
}

/**
 * Скидка в процентах: насколько тариф дешевле другого в пересчёте на неделю. Только целые проценты вниз —
 * «сэкономьте 80 %» не должно оказаться больше настоящей выгоды. null — какой-то цены нет или скидки нет.
 */
export function discountPercent(
  regular: { price: string | null | undefined, period: Period },
  offer: { price: string | null | undefined, period: Period }
): number | null {
  const a = parsePrice(regular.price)
  const b = parsePrice(offer.price)
  if (!a || !b || a.amount <= 0) return null
  const percent = Math.floor((1 - (b.amount / WEEKS[offer.period]) / (a.amount / WEEKS[regular.period])) * 100)
  return percent > 0 ? percent : null
}
