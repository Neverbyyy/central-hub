/** ⌘/Ctrl+Enter — «сохранить» в формах и окнах; просто Enter там — перенос строки или выбор. */
export const isModEnter = (event: KeyboardEvent) => (event.metaKey || event.ctrlKey) && event.key === 'Enter'
