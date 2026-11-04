// Языки текстов — по файлам набора ds, в порядке сервиса локализации. Новый язык (файл появился после выгрузки)
// показывается в конце, пока его нет в списке
const ORDER = ['en', 'ru', 'de', 'es', 'it', 'pt', 'fr', 'sv', 'nl']

export const sortLanguages = (codes: string[]) => [
  ...ORDER.filter(code => codes.includes(code)),
  ...codes.filter(code => !ORDER.includes(code))
]

const names = new Intl.DisplayNames(['ru'], { type: 'language' })

/** Подпись для инструментов команды: «DE — немецкий». */
export const languageLabel = (code: string) => `${code.toUpperCase()} — ${names.of(code)}`
