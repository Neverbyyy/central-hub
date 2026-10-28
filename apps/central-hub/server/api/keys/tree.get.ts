import { keyTreeNested } from '../../lib/keys'

// Разделы ключей для дерева слева
export default defineEventHandler(async (event) => {
  try {
    return await keyTreeNested(useDb(event))
  } catch (error) {
    throwHubError(error)
  }
})
