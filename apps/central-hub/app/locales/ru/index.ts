// Словарь языка целиком: файл раздела → его ключи (settings.json → t('settings.…')). Один чанк на язык
const files = import.meta.glob<Record<string, unknown>>('./*.json', { eager: true, import: 'default' })

export default Object.fromEntries(Object.entries(files).map(([path, messages]) => [path.slice(2, -'.json'.length), messages]))
