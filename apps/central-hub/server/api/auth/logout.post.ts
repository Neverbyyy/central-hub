export default defineEventHandler(async (event) => {
  const session = await useHubSession(event)
  await session.clear()
  return { authed: false, name: null }
})
