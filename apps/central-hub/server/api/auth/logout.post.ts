// Выход: сессия стирается. Ответ без тела — интерфейс сам знает, что человек вышел (signedOut)
export default defineEventHandler(async (event) => {
  await (await useHubSession(event)).clear()
  return sendNoContent(event)
})
