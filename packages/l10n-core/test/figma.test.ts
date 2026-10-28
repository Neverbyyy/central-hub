import { describe, expect, it } from 'vitest'
import { figmaName, figmaVariables } from '../src'

describe('figmaName', () => {
  it('точки → /, чтобы в Figma получилось дерево', () => {
    expect(figmaName('app.cars2.paywall.title')).toBe('app/cars2/paywall/title')
  })

  it('у строк InApp и Pages Hub точки внутри частей — тоже вложенность', () => {
    expect(figmaName('legacy.inapp.settings.auth.continue')).toBe('legacy/inapp/settings/auth/continue')
    expect(figmaName('legacy.pages_hub.a.gift_card.common.gift_card_code')).toBe('legacy/pages_hub/a/gift_card/common/gift_card_code')
  })
})

describe('figmaVariables', () => {
  const rows = [
    { technical_key: 'common.button.continue.default', translations: { en: 'Continue', ru: 'Продолжить' } },
    { technical_key: 'app.cars2.paywall.title', translations: { en: 'Unlock all cars!', de: null } }
  ]

  it('коллекция Localizations, каждый язык — режим, нет перевода — пустая строка', () => {
    expect(figmaVariables(rows, { languages: ['en', 'ru', 'de'] })).toEqual({
      Localizations: {
        'app/cars2/paywall/title': { $type: 'string', $value: { en: 'Unlock all cars!', ru: '', de: '' } },
        'common/button/continue/default': { $type: 'string', $value: { en: 'Continue', ru: 'Продолжить', de: '' } }
      }
    })
  })

  it('режимы только выбранных языков', () => {
    const file = figmaVariables(rows, { languages: ['ru'] })
    expect(file.Localizations!['common/button/continue/default']!.$value).toEqual({ ru: 'Продолжить' })
  })

  it('два ключа с одним именем — ошибка, а не молчаливая перезапись', () => {
    expect(() => figmaVariables([
      { technical_key: 'legacy.inapp.a/b.c', translations: {} },
      { technical_key: 'legacy.inapp.a.b.c', translations: {} }
    ], { languages: ['en'] })).toThrow('одно имя переменной Figma')
  })
})
