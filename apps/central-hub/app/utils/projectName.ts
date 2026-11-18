// Наборы выгрузки по-человечески — на языке интерфейса: «Дизайн-система» / «Design system»; InApp и Pages Hub — имена.
// Правило — exportProjectName в shared/utils/exportSets.ts, общее с сервером (он называет набор по-русски)
export const projectName = (name: string) => exportProjectName(name, currentHubLocale())

/** «InApp и Pages Hub» / «InApp and Pages Hub» — наборы одной строкой на языке интерфейса. */
export const projectList = (names: string[]) => exportProjectList(names, currentHubLocale())
