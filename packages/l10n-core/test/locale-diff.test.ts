import { describe, expect, it } from 'vitest'
import { describeLocaleChanges } from '../src'

describe('describeLocaleChanges', () => {
  const before = JSON.stringify({ allapps_button: 'СКАЧАТЬйцйцйц', basic: { title: 'Привет', body: 'Тело' } }, null, 2)

  it('изменённая, добавленная и удалённая строки — путь через точку', () => {
    const after = JSON.stringify({ allapps_button: 'СКАЧАТЬ', basic: { title: 'Привет' }, common: { button: { ok: 'Ок' } } }, null, 2)
    expect(describeLocaleChanges(before, after)).toEqual({
      added: [{ key: 'common.button.ok', before: undefined, after: 'Ок' }],
      changed: [{ key: 'allapps_button', before: 'СКАЧАТЬйцйцйц', after: 'СКАЧАТЬ' }],
      removed: [{ key: 'basic.body', before: 'Тело', after: undefined }]
    })
  })

  it('без правок — пусто, даже если форматирование другое', () => {
    expect(describeLocaleChanges(before, JSON.stringify(JSON.parse(before)))).toEqual({ added: [], changed: [], removed: [] })
  })

  it('файла не было — все строки новые', () => {
    expect(describeLocaleChanges(null, '{ "a.b": "x" }').added).toEqual([{ key: 'a.b', before: undefined, after: 'x' }])
  })

  it('дубль ключа сравнивается по последнему значению, как в vue-i18n', () => {
    expect(describeLocaleChanges('{ "a": "1", "a": "2" }', '{ "a": "2" }').changed).toEqual([])
  })
})
