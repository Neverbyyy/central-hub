// Кто вошёл, узнаём один раз при серверном рендере — клиент получает это из payload
export default defineNuxtPlugin(async () => {
  if (import.meta.client) return
  const user = useHubUser()
  user.value = await useRequestFetch()('/api/auth/me')
})
