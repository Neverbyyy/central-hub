import { findSimilar } from '../../lib/keys'

// Похожие строки для формы создания ключа
export default defineHubHandler(async (event) => {
  const { text, key } = getQuery(event)
  return await findSimilar(useDb(event), {
    text: typeof text === 'string' ? text.slice(0, 500) : undefined,
    key: typeof key === 'string' ? key.slice(0, 200) : undefined,
    limit: 8
  })
})
