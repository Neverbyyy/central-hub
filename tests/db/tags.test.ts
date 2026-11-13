import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { keyHistory } from '../../apps/central-hub/server/lib/history'
import { createKey, updateKeyMeta } from '../../apps/central-hub/server/lib/keys'
import { createTag, deleteTag, renameTag, setKeysTag } from '../../apps/central-hub/server/lib/tags'
import { ACTOR, anon, deprecateKeys, restoreKeys, service } from './clients'

// Теги — свой список (миграция 20261112100000_tags): создаются отдельно от ключей, у ключа — только теги из
// списка, переименование и удаление проходят по всем ключам с историей. Ключи служебные: создаются при первом
// прогоне и остаются (удалить строки нельзя); теги — свои на каждый прогон и в конце удаляются
const ALPHA = 'common.selftest.tags.alpha'
const BETA = 'common.selftest.tags.beta'
// Устаревший: тег ему не ставится, но переименование и удаление его касаются
const GAMMA = 'common.selftest.tags.gamma'
const RUN = Date.now().toString(36)
const tag = (name: string) => `selftest_${RUN}_${name}`
const by = { actor: ACTOR }
const created: string[] = []

const make = async (name: string) => {
  const result = await createTag(service, name, by)
  created.push(result.name)
  return result.name
}

const tagsOf = async (key: string) => {
  const { data, error } = await service.from('localizations').select('tags').eq('technical_key', key).single()
  if (error) throw error
  return data.tags as string[]
}

const counts = async () => {
  const { data, error } = await anon.rpc('get_tags')
  if (error) throw error
  return Object.fromEntries((data as { name: string, keys: number }[]).map(row => [row.name, row.keys]))
}

beforeAll(async () => {
  for (const key of [ALPHA, BETA, GAMMA]) {
    await createKey(service, { key, description: 'Служебный ключ автотестов тегов', translations: { en: 'Selftest tags' } }, { actor: ACTOR, source: 'ui', status: 'draft' })
      .catch((error: Error) => {
        if (!error.message.includes('уже есть')) throw error
      })
  }
  await restoreKeys([ALPHA, BETA, GAMMA])
})

afterAll(async () => {
  // Переименованные в тестах тоже здесь: список обновляется вместе с именем
  const { data } = await service.from('tags').select('name').like('name', `selftest_${RUN}_%`)
  for (const { name } of data ?? []) await deleteTag(service, name, by)
  await deprecateKeys([GAMMA])
})

describe('список тегов', () => {
  it('тег создаётся без ключей; «тот же» с другим регистром — отказ', async () => {
    const name = await make(`  ${tag('Landing')}  `)
    expect(name).toBe(tag('Landing'))
    await expect(createTag(service, tag('landing'), by)).rejects.toThrow(`Тег «${tag('Landing')}» уже есть`)
    expect((await counts())[name]).toBe(0)
  })

  it('пустое имя, запятая, длиннее 40 — отказ и на сервере, и в базе', async () => {
    await expect(createTag(service, '   ', by)).rejects.toThrow('Нужно название')
    await expect(createTag(service, 'a,b', by)).rejects.toThrow('запят')
    await expect(createTag(service, 'x'.repeat(41), by)).rejects.toThrow('длиннее 40')
    // Мимо сервера — правило держит сама таблица
    const { error } = await service.from('tags').insert({ name: 'selftest,comma' })
    expect(error?.code).toBe('23514')
  })

  it('публичный ключ читает список и счётчики, но не пишет', async () => {
    const name = await make(tag('public'))
    const { data } = await anon.rpc('get_unique_tags')
    expect((data as { tag: string }[]).map(row => row.tag)).toContain(name)
    expect(await counts()).toHaveProperty(name, 0)
    const { error } = await anon.from('tags').insert({ name: tag('anon') })
    expect(error).not.toBeNull()
  })
})

describe('теги ключей', () => {
  it('поставить и снять: только действующие ключи и только где что-то меняется; в историю не пишется', async () => {
    const name = await make(tag('set'))
    await deprecateKeys([GAMMA])
    const { data: last } = await service.from('history').select('id').order('id', { ascending: false }).limit(1).single()
    expect((await setKeysTag(service, { keys: [ALPHA, BETA, GAMMA], tag: name, on: true }, by)).count).toBe(2)
    expect(await tagsOf(ALPHA)).toContain(name)
    expect(await tagsOf(GAMMA)).not.toContain(name)
    // Уже стоит — ничего не меняется, грид у коллег не будится
    expect((await setKeysTag(service, { keys: [ALPHA, BETA], tag: name, on: true }, by)).count).toBe(0)
    expect((await setKeysTag(service, { keys: [ALPHA], tag: name, on: false }, by)).count).toBe(1)
    expect(await tagsOf(ALPHA)).not.toContain(name)
    expect((await counts())[name]).toBe(1)

    // Каждая галочка давала запись «Теги» — история тонула в них (решение владельца: теги в историю не пишутся)
    const { data: written } = await service.from('history').select('id')
      .in('technical_key', [ALPHA, BETA]).eq('field', 'tags').gt('id', last!.id)
    expect(written).toEqual([])
    await restoreKeys([GAMMA])
  })

  it('прежние записи о тегах в истории ключа не показываются', async () => {
    // Записи до миграции 20261113100000 остаются в таблице: история только дополняется
    const { error } = await service.from('history').insert({ technical_key: ALPHA, field: 'tags', old_value: '', new_value: tag('old'), actor: ACTOR, source: 'ui' })
    expect(error).toBeNull()
    const { actions } = await keyHistory(service, ALPHA, { limit: 50 })
    expect(actions.flatMap(action => action.entries).some(entry => entry.field === 'tags')).toBe(false)
  })

  it('ответ несёт время записи — по нему интерфейс отличает старые события Realtime от событий с этой правкой', async () => {
    const name = await make(tag('time'))
    const { updatedAt } = await setKeysTag(service, { keys: [ALPHA, BETA], tag: name, on: true }, by)
    const { data } = await service.from('localizations').select('technical_key, updated_at').in('technical_key', [ALPHA, BETA])
    // Оба ключа поменялись одной записью — у обоих это время
    expect(data!.map(row => Date.parse(row.updated_at))).toEqual([Date.parse(updatedAt!), Date.parse(updatedAt!)])
    // Следующая правка — позже; без изменений время остаётся временем последней записи
    const next = await setKeysTag(service, { keys: [ALPHA], tag: name, on: false }, by)
    expect(Date.parse(next.updatedAt!)).toBeGreaterThan(Date.parse(updatedAt!))
    const same = await setKeysTag(service, { keys: [BETA], tag: name, on: true }, by)
    expect(same.count).toBe(0)
    expect(Date.parse(same.updatedAt!)).toBe(Date.parse(updatedAt!))
  })

  it('тега нет в списке — не ставится ни формой, ни нейросетью, ни мимо сервера', async () => {
    const missing = tag('missing')
    await expect(setKeysTag(service, { keys: [ALPHA], tag: missing, on: true }, by)).rejects.toThrow('нет')
    await expect(updateKeyMeta(service, { key: ALPHA, description: 'Служебный ключ автотестов тегов', tags: [missing] }, by))
      .rejects.toThrow(`Тега «${missing}» нет — создайте его в «Все теги» над таблицей или правым кликом по ключу`)
    await expect(createKey(service, { key: 'common.selftest.tags.unknown_tag', description: 'Служебный ключ автотестов тегов', translations: { en: 'x' }, tags: [missing] }, { actor: ACTOR, source: 'mcp', status: 'ai' }))
      .rejects.toThrow('создайте его в «Все теги» над таблицей или правым кликом по ключу')
    const { error } = await service.from('localizations').update({ tags: [missing] }).eq('technical_key', ALPHA)
    expect(error?.message).toContain('создайте его в «Все теги» над таблицей или правым кликом по ключу')
  })

  it('не больше 20 тегов у ключа', async () => {
    const many = await Promise.all(Array.from({ length: 21 }, (_, i) => make(tag(`many_${i}`))))
    const { error } = await service.from('localizations').update({ tags: many }).eq('technical_key', BETA)
    expect(error?.message).toContain('уже 20 тегов')
  })
})

describe('переименование и удаление', () => {
  it('переименование — у всех ключей, и у устаревших; смена регистра тоже; занятое имя — отказ', async () => {
    const name = await make(tag('old'))
    const other = await make(tag('other'))
    await setKeysTag(service, { keys: [ALPHA, GAMMA], tag: name, on: true }, by)
    await deprecateKeys([GAMMA])
    // У устаревшего тег остаётся со времён, когда он был действующим
    expect(await tagsOf(GAMMA)).toContain(name)

    expect((await renameTag(service, { from: name, to: tag('new') }, by)).count).toBe(2)
    expect(await tagsOf(ALPHA)).toContain(tag('new'))
    expect(await tagsOf(GAMMA)).toContain(tag('new'))
    expect(await tagsOf(ALPHA)).not.toContain(name)

    expect((await renameTag(service, { from: tag('new'), to: tag('NEW') }, by)).count).toBe(2)
    expect(await tagsOf(ALPHA)).toContain(tag('NEW'))

    await expect(renameTag(service, { from: tag('NEW'), to: other.toUpperCase() }, by)).rejects.toThrow(`Тег «${other}» уже есть`)
    await expect(renameTag(service, { from: tag('gone'), to: tag('x') }, by)).rejects.toThrow('нет')
    await restoreKeys([GAMMA])
  })

  it('удаление снимает тег со всех ключей и убирает из списка', async () => {
    const name = await make(tag('delete'))
    await setKeysTag(service, { keys: [ALPHA, BETA], tag: name, on: true }, by)
    expect((await deleteTag(service, name, by)).count).toBe(2)
    expect(await tagsOf(ALPHA)).not.toContain(name)
    expect(await tagsOf(BETA)).not.toContain(name)
    expect(await counts()).not.toHaveProperty(name)
    await expect(deleteTag(service, name, by)).rejects.toThrow('нет')
  })
})
