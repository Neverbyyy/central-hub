import type { H3Event } from 'h3'

/** Общий пароль сервиса (NUXT_HUB_PASSWORD) — вход рядом с Google; пусто — вход по паролю выключен. */
export const hubPassword = (event: H3Event) => (useRuntimeConfig(event).hubPassword as string | undefined) ?? ''
