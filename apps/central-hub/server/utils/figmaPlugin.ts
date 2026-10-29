import type { H3CorsOptions, H3Event } from 'h3'

// Плагин Figma ходит из интерфейса с origin null и с токеном вместо сессии, поэтому CORS открыт всем:
// без верного токена маршрут ничего не отдаёт
const CORS: H3CorsOptions = { origin: '*', methods: ['GET'], allowHeaders: ['authorization'] }

/**
 * Маршрут плагина «Amaya Hub — тексты»: preflight, токен NUXT_FIGMA_TOKEN, ошибки — JSON { error }.
 * Файл маршрута — без метода в имени: иначе OPTIONS до него не дойдёт и уйдёт в рендер страниц.
 * Ошибку отдаём сами, а не страницей ошибки Nitro: плагин должен прочитать её текст, а не упасть на CORS.
 */
export const defineFigmaPluginHandler = <T>(handler: (event: H3Event) => Promise<T>) =>
  defineEventHandler(async (event) => {
    if (handleCors(event, CORS)) return
    try {
      if (event.method !== 'GET') throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed', message: 'Только GET' })
      requireToken(event, 'figma')
      return await handler(event).catch(throwHubError)
    } catch (error) {
      if (!isError(error)) console.error('[figma-plugin]', error)
      const { statusCode, message } = isError(error) ? error : { statusCode: 500, message: 'Ошибка сервиса' }
      setResponseStatus(event, statusCode)
      return { error: message }
    }
  })
