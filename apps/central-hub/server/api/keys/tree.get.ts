import { keyTreeNested } from '../../lib/keys'

// Разделы ключей для дерева слева и подсказок в форме «Новый ключ»
export default defineHubHandler(event => keyTreeNested(useDb(event)))
