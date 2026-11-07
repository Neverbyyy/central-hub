import { defineNuxtPlugin } from 'nuxt/app'
import { useOwnRiveWasm } from './assets'

export default defineNuxtPlugin(() => useOwnRiveWasm())
