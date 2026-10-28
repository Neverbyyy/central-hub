import { describe, expect, it } from 'vitest'
import { descriptionError, figmaUrlError, isPrefixConflict, keyError, newKeyError, type KeyContext } from '../src'

const ctx: KeyContext = {
  registry: {
    game: ['cars2', 'farm'],
    site: ['lp_cars2', 'amayakids'],
    brand: ['bandk'],
    test: ['tm12', 'ua5'],
    project: ['inapp', 'pages_hub']
  },
  languages: ['en', 'ru', 'de', 'es', 'it', 'pt', 'fr', 'sv', 'nl']
}

describe('keyError', () => {
  // Примеры из «Как называть ключи»
  it.each([
    'common.button.continue.default',
    'common.button.continue.trial_days',
    'common.button.restore',
    'common.link.privacy_policy',
    'common.price.per_week',
    'app.cars2.paywall.title',
    'app.cars2.paywall.plan.year.badge',
    'app.farm.onboarding.step_1.title',
    'web.amayakids.home.hero.title',
    'web.lp_cars2.home.faq.q_1.title',
    'brand.bandk.legal.company_name',
    'ds.close_button.aria.label',
    'test.tm12.app.cars2.paywall.title',
    'test.ua5.web.lp_cars2.home.hero.title',
    'legacy.inapp.continue_btn_std',
    'legacy.inapp.more_apps_account_forgot password_btn',
    'legacy.inapp.m9.UI_Onboarding_ChooseGrade1gr4',
    'legacy.pages_hub.a.gift_card.common.gift_card_code'
  ])('принимает %s', (key) => {
    expect(keyError(key, ctx)).toBeNull()
  })

  it.each([
    ['', 'пустой'],
    ['common', 'минимум три части'],
    ['common.button', 'минимум три части'],
    ['common.button..continue', 'пустая часть'],
    ['common.button.continue.', 'пустая часть'],
    ['foo.bar.baz', 'начинается с'],
    ['Common.button.continue', 'начинается с'],
    ['common.Button.continue', 'латиница'],
    ['common.big-red.button', 'латиница'],
    ['app.cars_2.paywall.title', 'код игры «cars_2»'],
    ['web.lp_cars3.home.title', 'код сайта'],
    ['brand.acme.legal.name', 'код бренда'],
    ['test.tm99.app.cars2.paywall.title', 'код теста'],
    ['legacy.hyper.some_key', 'код проекта'],
    ['app.cars2.paywall.title_ru', 'языка: «title_ru»'],
    ['common.de.button.continue', 'языка: «de»'],
    ['test.tm12.app.cars2', 'минимум три части'],
    ['test.tm12.test.ua5.app.cars2.title', 'обычный ключ'],
    ['test.tm12.legacy.inapp.continue_btn_std', 'обычный ключ'],
    [`common.${'x'.repeat(200)}.y`, 'длиннее']
  ])('отклоняет «%s»', (key, message) => {
    expect(keyError(key, ctx)).toContain(message)
  })
})

describe('newKeyError', () => {
  it('legacy.* создать нельзя, хотя такое имя проходит keyError', () => {
    const key = 'legacy.pages_hub.a.gift_card.common.gift_card'
    expect(keyError(key, ctx)).toBeNull()
    expect(newKeyError(key, ctx)).toContain('только импортом')
  })

  it('обычный ключ — без ошибки, ошибки keyError сохраняются', () => {
    expect(newKeyError('common.button.continue.default', ctx)).toBeNull()
    expect(newKeyError('App.title.x', ctx)).toBe(keyError('App.title.x', ctx))
  })
})

describe('descriptionError', () => {
  it('описание короче 10 символов — ошибка с текущей длиной', () => {
    expect(descriptionError('  asd ')).toContain('сейчас 3')
    expect(descriptionError('Кнопка на пейволле')).toBeNull()
  })
})

describe('figmaUrlError', () => {
  it('пустая ссылка и ссылка на figma.com — без ошибки', () => {
    expect(figmaUrlError('')).toBeNull()
    expect(figmaUrlError(' https://www.figma.com/design/abc/Cars?node-id=1-2 ')).toBeNull()
    expect(figmaUrlError('https://figma.com/file/abc')).toBeNull()
  })

  it('чужой адрес или http — ошибка', () => {
    expect(figmaUrlError('https://example.com/figma.com/x')).toContain('figma.com')
    expect(figmaUrlError('http://www.figma.com/design/abc')).toContain('figma.com')
  })
})

describe('isPrefixConflict', () => {
  it('ключ не может быть началом другого', () => {
    expect(isPrefixConflict('common.button.continue', 'common.button.continue.trial')).toBe(true)
    expect(isPrefixConflict('common.button.continue.trial', 'common.button.continue')).toBe(true)
  })

  it('совпадение начала строки без точки — не конфликт', () => {
    expect(isPrefixConflict('common.button.continue', 'common.button.continue_trial')).toBe(false)
    expect(isPrefixConflict('common.button.continue', 'common.button.continue')).toBe(false)
  })
})
