import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { createMcpServer } from '../lib/mcp'

// Ответ без страницы ошибки Nuxt: клиенты MCP ходят сюда с Accept: text/event-stream,
// и брошенная ошибка отрисовывалась бы через Vue как HTML
const reply = (status: number, message: string, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify({ error: message }), { status, headers: { 'content-type': 'application/json', ...headers } })

// MCP для нейросетей: POST /mcp с заголовком Authorization: Bearer <NUXT_MCP_TOKEN>.
// Без сессий: на каждый запрос новый сервер и транспорт — так он работает и в serverless на Vercel.
export default defineEventHandler(async (event) => {
  try {
    requireToken(event, 'mcp')
  } catch (error) {
    const { statusCode, message } = error as { statusCode: number, message: string }
    return reply(statusCode, message, statusCode === 401 ? { 'www-authenticate': 'Bearer' } : {})
  }
  if (event.method !== 'POST') return reply(405, 'MCP работает без сессий: только POST', { allow: 'POST' })

  const server = createMcpServer(useDb(event))
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true })
  await server.connect(transport)
  try {
    return await transport.handleRequest(toWebRequest(event))
  } finally {
    await server.close()
  }
})
