export default defineEventHandler(async (event) => {
  const { data } = await useHubSession(event)
  return { authed: !!data.authed, name: data.name ?? null }
})
