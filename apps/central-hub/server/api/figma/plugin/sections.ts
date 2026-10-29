import { figmaPluginSections } from '../../../lib/figma'

// Окно плагина: дерево разделов и языки с именами режимов
export default defineFigmaPluginHandler(async event => figmaPluginSections(useDb(event)))
