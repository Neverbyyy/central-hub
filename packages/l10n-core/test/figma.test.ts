import { describe, expect, it } from 'vitest'
import { figmaModeFiles, figmaModeName, figmaName, figmaVariables } from '../src'

describe('figmaName', () => {
  it('точки → /, чтобы в Figma получилось дерево', () => {
    expect(figmaName('app.cars2.paywall.title')).toBe('app/cars2/paywall/title')
  })

  it('у строк InApp и Pages Hub точки внутри частей — тоже вложенность', () => {
    expect(figmaName('legacy.inapp.settings.auth.continue')).toBe('legacy/inapp/settings/auth/continue')
  })
})

describe('figmaModeFiles', () => {
  const rows = [
    { technical_key: 'common.button.continue.default', translations: { en: 'Continue', ru: 'Продолжить' }, description: 'Главная кнопка' },
    { technical_key: 'app.cars2.paywall.title', translations: { en: 'Unlock all cars!', de: null } }
  ]

  it('файл на каждый язык, ключи — вложенные группы, строки в формате DTCG', () => {
    const files = figmaModeFiles(rows, { languages: ['en', 'ru'] })
    expect(Object.keys(files)).toEqual(['en', 'ru'])
    expect(files.ru).toEqual({
      app: { cars2: { paywall: { title: { $type: 'string', $value: '' } } } },
      common: { button: { continue: { default: { $type: 'string', $value: 'Продолжить', $description: 'Главная кнопка' } } } }
    })
  })

  it('каждый ключ есть в каждом файле — иначе Figma не создаст переменную', () => {
    const files = figmaModeFiles(rows, { languages: ['en', 'de'] })
    expect((files.de as any).app.cars2.paywall.title.$value).toBe('')
    expect((files.de as any).common.button.continue.default.$value).toBe('')
    expect((files.en as any).app.cars2.paywall.title.$value).toBe('Unlock all cars!')
  })

  it('ключ внутри строки или совпадение с группой — ошибка, а не молчаливая потеря', () => {
    expect(() => figmaModeFiles([
      { technical_key: 'legacy.x.a.b', translations: {} },
      { technical_key: 'legacy.x.a.b.c', translations: {} }
    ], { languages: ['en'] })).toThrow('вложен в строку «legacy/x/a/b»')
    // Порядок во входных данных не важен — короткий ключ всё равно обнаружится первым
    expect(() => figmaModeFiles([
      { technical_key: 'legacy.x.a.b.c', translations: {} },
      { technical_key: 'legacy.x.a.b', translations: {} }
    ], { languages: ['en'] })).toThrow('вложен в строку «legacy/x/a/b»')
    expect(() => figmaModeFiles([
      { technical_key: 'legacy.x.a', translations: {} },
      { technical_key: 'legacy.x.a', translations: {} }
    ], { languages: ['en'] })).toThrow('встречается дважды')
  })

  it('часть ключа, которую DTCG поймёт иначе, — ошибка', () => {
    expect(() => figmaModeFiles([{ technical_key: 'legacy.x.$value', translations: {} }], { languages: ['en'] })).toThrow('часть «$value»')
  })
})

describe('figmaModeName', () => {
  it('режимы — английские названия языков, как у дизайнера в Figma', () => {
    expect(['en', 'ru', 'de', 'es', 'it', 'pt', 'fr', 'sv', 'nl'].map(figmaModeName)).toEqual(
      ['English', 'Russian', 'German', 'Spanish', 'Italian', 'Portuguese', 'French', 'Swedish', 'Dutch']
    )
  })
})

describe('figmaVariables', () => {
  it('переменная на ключ: имя через /, описание, тексты выбранных языков; нет перевода — пустая строка', () => {
    expect(figmaVariables([
      { technical_key: 'common.button.continue.default', translations: { en: 'Continue', ru: 'Продолжить' }, description: 'Главная кнопка' },
      { technical_key: 'app.cars2.paywall.title', translations: { en: 'Unlock all cars!', ru: null } }
    ], { languages: ['en', 'ru'] })).toEqual([
      { key: 'app.cars2.paywall.title', name: 'app/cars2/paywall/title', description: '', values: { en: 'Unlock all cars!', ru: '' } },
      { key: 'common.button.continue.default', name: 'common/button/continue/default', description: 'Главная кнопка', values: { en: 'Continue', ru: 'Продолжить' } }
    ])
  })

  it('те же проверки имён, что у файлов для импорта', () => {
    expect(() => figmaVariables([
      { technical_key: 'legacy.x.a.b.c', translations: {} },
      { technical_key: 'legacy.x.a.b', translations: {} }
    ], { languages: ['en'] })).toThrow('вложен в строку «legacy/x/a/b»')
    expect(() => figmaVariables([{ technical_key: 'legacy.x.{a}', translations: {} }], { languages: ['en'] })).toThrow('часть «{a}»')
  })
})
