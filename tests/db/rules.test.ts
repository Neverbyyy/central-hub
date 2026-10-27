import { beforeAll, describe, expect, it } from 'vitest'
import { ANCHOR, ensureAnchor, readAnchor, service } from './clients'

// Здесь только записи, которые база обязана отклонить. Если правило сломается,
// мусорная строка останется навсегда — удалять строки нельзя никому.

beforeAll(ensureAnchor)

const insert = (row: Record<string, unknown>) =>
  service.from('localizations').insert({ description: 'Автотест правил', ...row })

describe('правила имени ключа в базе', () => {
  it.each([
    ['Common.button.continue', 'начинается с'],
    ['common.button', 'минимум три части'],
    ['common.selftest..x', 'пустая часть'],
    ['common.Selftest.x', 'латиница'],
    ['app.cars_2.paywall.title', 'код игры «cars_2»'],
    ['test.tm99.app.cars2.paywall.title', 'код теста'],
    ['test.tm12.app.cars2.paywall.Title', 'латиница'],
    ['legacy.hyper.some_key', 'код проекта'],
    ['app.cars2.paywall.title_ru', 'языка: «title_ru»']
  ])('отклоняет «%s»', async (key, message) => {
    const { error } = await insert({ technical_key: key })
    expect(error?.message).toContain(message)
  })

  it('новый ключ без описания не создаётся', async () => {
    const { error } = await service.from('localizations').insert({ technical_key: 'common.selftest.no_description' })
    expect(error?.message).toContain('localizations_description_required')
  })

  it.each([
    ['common.selftest.anchor', 'короче существующего'],
    [`${ANCHOR}.extra`, 'длиннее существующего']
  ])('ключ не может быть началом другого: %s (%s)', async (key) => {
    const { error } = await insert({ technical_key: key })
    expect(error?.message).toContain('один ключ не может быть началом другого')
  })

  it('переводы только на известных языках и только строками', async () => {
    const unknownLanguage = await insert({ technical_key: 'common.selftest.bad_language', translations: { xx: 'a' } })
    expect(unknownLanguage.error?.message).toContain('Неизвестный язык «xx»')

    const notString = await insert({ technical_key: 'common.selftest.not_string', translations: { en: 5 } })
    expect(notString.error?.message).toContain('Перевод должен быть строкой')
  })
})

describe('строки не удаляются и не переименовываются', () => {
  it('delete запрещён даже серверу', async () => {
    const { error } = await service.from('localizations').delete().eq('technical_key', ANCHOR)
    expect(error?.message).toContain('Строки нельзя удалять')
    expect((await readAnchor()).technical_key).toBe(ANCHOR)
  })

  it('ключ нельзя переименовать', async () => {
    const { error } = await service.from('localizations').update({ technical_key: 'common.selftest.renamed' }).eq('technical_key', ANCHOR)
    expect(error?.message).toContain('нельзя переименовывать')
  })

  it('история только дополняется', async () => {
    const { error } = await service.from('history').delete().eq('technical_key', ANCHOR)
    expect(error?.message).toContain('История только дополняется')
  })
})
