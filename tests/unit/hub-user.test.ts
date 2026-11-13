import { describe, expect, it } from 'vitest'
import { awaitsName, sessionData, sessionUser } from '../../apps/central-hub/server/lib/hub-user'
import { cleanLoginName, loginNameError } from '../../apps/central-hub/shared/utils/auth'

// Кто вошёл по cookie сессии (apps/central-hub/server/lib/hub-user.ts): через Google или по общему паролю
describe('кто вошёл', () => {
  it('Google — по адресу; сессии до поля via тоже', () => {
    expect(sessionUser({ email: 'anton@amayasoft.uz', name: 'Антон Петров', firstName: 'Антон', via: 'google' }))
      .toEqual({ email: 'anton@amayasoft.uz', name: 'Антон Петров', firstName: 'Антон', via: 'google' })
    expect(sessionUser({ email: 'anton@amayasoft.uz', name: 'Антон Петров' }))
      .toEqual({ email: 'anton@amayasoft.uz', name: 'Антон Петров', firstName: 'Антон', via: 'google' })
  })

  it('общий пароль — по пометке via, без адреса', () => {
    expect(sessionUser({ name: 'Мария Иванова', firstName: 'Мария', via: 'password' }))
      .toEqual({ email: null, name: 'Мария Иванова', firstName: 'Мария', via: 'password' })
  })

  it('cookie прежнего входа паролем ({ authed, name }), без имени и пустая — не вход', () => {
    expect(sessionUser({ authed: true, name: 'Старый' } as never)).toBeNull()
    expect(sessionUser({ email: 'anton@amayasoft.uz' })).toBeNull()
    expect(sessionUser({ via: 'password' })).toBeNull()
    expect(sessionUser({})).toBeNull()
  })

  it('пароль верный, имени ещё нет — ждём «Как вас зовут?», это ещё не вход', () => {
    expect(awaitsName({ via: 'password' })).toBe(true)
    expect(sessionUser({ via: 'password' })).toBeNull()
    expect(awaitsName({ via: 'password', name: 'Мария' })).toBe(false)
    expect(awaitsName({ email: 'a@amayasoft.uz', name: 'А', via: 'google' })).toBe(false)
    expect(awaitsName({})).toBe(false)
  })

  it('в сессию — только поля своего входа: у пароля нет адреса', () => {
    expect(sessionData({ email: null, name: 'Мария', firstName: 'Мария', via: 'password' })).toEqual({ name: 'Мария', firstName: 'Мария', via: 'password' })
    expect(sessionData({ email: 'a@amayasoft.uz', name: 'А Б', firstName: 'А', via: 'google' })).toEqual({ email: 'a@amayasoft.uz', name: 'А Б', firstName: 'А', via: 'google' })
  })
})

describe('имя при входе по паролю', () => {
  it('пробелы по краям и подряд не в счёт; 2–40 символов', () => {
    expect(cleanLoginName('  Мария   Иванова ')).toBe('Мария Иванова')
    expect(loginNameError('Мария Иванова')).toBeNull()
    expect(loginNameError('Ян')).toBeNull()
    expect(loginNameError('   ')).toMatch('Введите имя')
    expect(loginNameError(' Я ')).toBe('Имя — от 2 до 40 символов')
    expect(loginNameError('я'.repeat(41))).toBe('Имя — от 2 до 40 символов')
  })
})
