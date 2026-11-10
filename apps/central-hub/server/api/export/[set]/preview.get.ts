// Что уйдёт в PR, если нажать «Выгрузить»: сравнение с основной веткой, без записи
export default defineHubHandler(event => exportToGithub(event, getRouterParam(event, 'set')!, { actor: '', dryRun: true }))
