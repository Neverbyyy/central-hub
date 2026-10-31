import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { figmaModeFiles, figmaModeName, figmaName, figmaText, figmaVariables, readLocaleFile } from '../src'

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

  it('тексты — без разметки, с переносами строк', () => {
    const [variable] = figmaVariables([
      { technical_key: 'legacy.inapp.title', translations: { en: 'Open<br/>the world', ru: 'Откройте <b>мир</b>' } }
    ], { languages: ['en', 'ru'] })
    expect(variable!.values).toEqual({ en: 'Open \nthe world', ru: 'Откройте мир' })
  })
})

describe('figmaText — разметку Figma не понимает, в переменную уходит чистый текст', () => {
  const NBSP = ' '

  // Перед переносом всегда один пробел: таблица Variables рисует значение в одну строку и без пробела
  // склеивала бы строки («appsin»). Новая строка на холсте с пробела не начинается
  it('примеры из макетов Антона: <br> — перенос строки, span убирается', () => {
    expect(figmaText('ОТКРОЙТЕ МИР<br />МОДЫ И ТВОРЧЕСТВА!')).toBe('ОТКРОЙТЕ МИР \nМОДЫ И ТВОРЧЕСТВА!')
    expect(figmaText('ХОТИТЕ ОТКРЫТЬ <span style="color: #EC0053;"><br />ВСЕ МАШИНКИ БЕСПЛАТНО</span> НА 7 ДНЕЙ?'))
      .toBe('ХОТИТЕ ОТКРЫТЬ \nВСЕ МАШИНКИ БЕСПЛАТНО НА 7 ДНЕЙ?')
    expect(figmaText('Откройте полный доступ<br/>и отключите рекламу навсегда')).toBe('Откройте полный доступ \nи отключите рекламу навсегда')
  })

  it('все виды <br> в любом регистре; пробел перед переносом — ровно один, после — ни одного', () => {
    expect(figmaText('a<br>b<br/>c<br />d<BR>e<Br  />f')).toBe('a \nb \nc \nd \ne \nf')
    expect(figmaText('a   <br/>   b')).toBe('a \nb')
    // Перенос, который уже был в тексте, — по тому же правилу
    expect(figmaText('a\nb')).toBe('a \nb')
  })

  it('оформление HTML убирается, текст остаётся', () => {
    expect(figmaText('All dinosaurs and <strong>20+</strong> fun apps <br><span>in ONE subscription!</span>'))
      .toBe('All dinosaurs and 20+ fun apps \nin ONE subscription!')
    expect(figmaText('<b>Bold</b>, <u>underline</u>, <span style="font-weight: 700;">weight</span>')).toBe('Bold, underline, weight')
    // Кавычки «ёлочки» вместо прямых — так тоже встречается в данных
    expect(figmaText('<span style=“color: #0054B3”>Blue</span>')).toBe('Blue')
  })

  it('разметка Unity TextMeshPro из InApp — тоже', () => {
    expect(figmaText('Details: <#FF8D24><link=email>https://support.apple.com</link></color>')).toBe('Details: https://support.apple.com')
    expect(figmaText('<link><#FF8D24><u>https://x.y</u></color></link> <link = email>mail</link>')).toBe('https://x.y mail')
    expect(figmaText('<size=81.8%>Welcome to</size> <color=#ff6c00>{0}</color> <cspace=0.05em>ONE</cspace>')).toBe('Welcome to {0} ONE')
  })

  it('сущности — символами; &nbsp; — неразрывный пробел; в <nobr> пробелы неразрывные', () => {
    expect(figmaText('7&nbsp;дней &laquo;Ферма&raquo; &amp; &#169; &#x2014;')).toBe(`7${NBSP}дней «Ферма» & © —`)
    expect(figmaText('Unbegrenzten <nobr>Zugang erhalten</nobr>')).toBe(`Unbegrenzten Zugang${NBSP}erhalten`)
    // Незнакомую сущность не трогаем
    expect(figmaText('&unknown;')).toBe('&unknown;')
  })

  it('экранирование vue-i18n — сам символ; подстановки и формы остаются', () => {
    expect(figmaText('support{\'@\'}example.com')).toBe('support@example.com')
    expect(figmaText('{price} / week · {count} day | {count} days · {0}')).toBe('{price} / week · {count} day | {count} days · {0}')
  })

  it('что не тег — не трогаем', () => {
    expect(figmaText('a < b, I <3 farm, 2<5')).toBe('a < b, I <3 farm, 2<5')
    // &lt;b&gt; — текст «<b>», а не тег: сущности раскрываются после снятия тегов
    expect(figmaText('&lt;b&gt; tag')).toBe('<b> tag')
    expect(figmaText('')).toBe('')
  })

  it('во всех строках InApp и Pages Hub после figmaText не остаётся ни тегов, ни сущностей', () => {
    const FIXTURES = join(import.meta.dirname, '../../../fixtures/legacy')
    const left: string[] = []
    for (const dir of ['inapp/src/locales', 'pages-hub/i18n/locales']) {
      for (const lang of ['en', 'ru', 'de', 'es', 'it', 'pt', 'fr', 'sv', 'nl']) {
        for (const { path, value } of readLocaleFile(readFileSync(join(FIXTURES, dir, `${lang}.json`), 'utf8'))) {
          const text = figmaText(value ?? '')
          if (/<\/?[a-z#][^<>]*>|&[a-z#][a-z0-9]*;/i.test(text)) left.push(`${dir}/${lang}: ${path.join('.')} → ${text}`)
        }
      }
    }
    expect(left).toEqual([])
  })
})
