import { describe, expect, it } from 'vitest'
import { filterTags, tagCoverage } from '../../apps/central-hub/app/utils/tags'
import { findTag, MAX_TAG_LENGTH, tagNameError } from '../../apps/central-hub/shared/utils/tags'

// Теги: правило имени (shared/utils/tags.ts — то же держит база) и меню правого клика (app/utils/tags.ts)
describe('имя тега', () => {
  it('обычные имена — можно, пробелы по краям не в счёт', () => {
    for (const name of ['landing', 'lp_cars2', 'design-system', 'Black Friday', '  ds  ', 'я'.repeat(MAX_TAG_LENGTH)]) {
      expect(tagNameError(name)).toBeNull()
    }
  })

  it('пустое, длиннее 40 и с запятой (она разделяет теги в адресе фильтра) — нет', () => {
    expect(tagNameError('')).toMatch('Нужно название')
    expect(tagNameError('   ')).toMatch('Нужно название')
    expect(tagNameError('я'.repeat(MAX_TAG_LENGTH + 1))).toMatch('длиннее 40')
    expect(tagNameError('a,b')).toMatch('запят')
  })

  it('есть ли тег — без учёта регистра и пробелов, имя — как в списке', () => {
    const tags = ['landing', 'Black Friday']
    expect(findTag(tags, ' LANDING ')).toBe('landing')
    expect(findTag(tags, 'black friday')).toBe('Black Friday')
    expect(findTag(tags, 'land')).toBeUndefined()
  })
})

describe('меню тегов', () => {
  it('галочка — тег у всех ключей; у части — счётчик для «2 из 5»', () => {
    const lists = [['ds', 'paywall'], ['ds'], ['paywall']]
    expect(tagCoverage(lists, 'ds')).toEqual({ count: 2, all: false })
    expect(tagCoverage(lists, 'landing')).toEqual({ count: 0, all: false })
    expect(tagCoverage([['ds'], ['ds', 'a11y']], 'ds')).toEqual({ count: 2, all: true })
    expect(tagCoverage([], 'ds')).toEqual({ count: 0, all: false })
  })

  it('поиск: без учёта регистра, сначала начинающиеся с запроса; пусто — все', () => {
    const tags = ['cars2', 'cars2_go', 'lp_cars2', 'landing', 'Paywall']
    expect(filterTags(tags, 'cars')).toEqual(['cars2', 'cars2_go', 'lp_cars2'])
    expect(filterTags(tags, 'PAY')).toEqual(['Paywall'])
    expect(filterTags(tags, '  ')).toEqual(tags)
    expect(filterTags(tags, 'xyz')).toEqual([])
  })
})
