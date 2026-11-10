// Разделы ключей. В адресе и фильтре раздел — с точкой на конце (app.cars2.), чтобы не цеплять app.cars2_go;
// в дереве — без неё (app.cars2)

/** Раздел без точки на конце: app.cars2. → app.cars2 */
export const sectionPath = (prefix: string) => prefix.replace(/\.$/, '')

/** Разделы выше по дереву: app.cars2.paywall → app, app.cars2 */
export const sectionAncestors = (path: string) =>
  path.split('.').slice(0, -1).map((_, i, parts) => parts.slice(0, i + 1).join('.'))

/** Ссылка на ключ в таблице: поиск по нему и открытая панель. */
export const keyRoute = (key: string) => ({ path: '/localizations', query: { q: key, key } })
