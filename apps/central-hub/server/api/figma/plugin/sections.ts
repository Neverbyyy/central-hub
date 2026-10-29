import { figmaPluginSections } from '../../../lib/figma'

// Окно плагина: разделы двух уровней и языки с именами режимов
export default defineFigmaPluginHandler(async event => figmaPluginSections(useDb(event)))
