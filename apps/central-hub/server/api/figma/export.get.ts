import { figmaExport } from '../../lib/figma'

// Выборка для встроенного импорта Figma: ?prefixes=common.,app.cars2.&langs=en,ru → { files: { en: …, ru: … } },
// файл на язык = режим. За общим паролем; плагин ходит в /api/figma/plugin/* со своим токеном.
export default defineHubHandler(event => figmaExport(useDb(event), figmaSelection(event)))
