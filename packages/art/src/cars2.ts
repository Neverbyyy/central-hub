// Арт Cars 2, нужный и экранам, и лендингам: анимация и наборы машин. Файлы лежат здесь в одном экземпляре,
// уникальный арт экрана или лендинга — в его папке
import { imageSetFromFiles } from '@amaya/ui'

export { default as cars2Animation } from '../cars2/animation-paywall-cars.riv?url'

export const CARS2_UNLOCKS = ['city', 'christmas', 'halloween', 'construction', 'modern', 'zoo', 'monstertrucks'] as const
export type Cars2Unlock = typeof CARS2_UNLOCKS[number]

// Два набора адресов: лендингу не нужны png и размер large, а адреса попадают в его чанк
const unlockFiles = import.meta.glob<string>('../cars2/unlock/*.{png,webp}', { query: '?url', import: 'default', eager: true })
const worldFiles = import.meta.glob<string>('../cars2/unlock/*-small{,@2x}.webp', { query: '?url', import: 'default', eager: true })

/** Карточка набора машин для экранов: все размеры, webp и png. */
export const cars2UnlockArt = (name: Cars2Unlock) => imageSetFromFiles(unlockFiles, `../cars2/unlock/${name}`)

/** Та же карточка для лендинга: только webp телефона. */
export const cars2WorldArt = (name: Cars2Unlock) => imageSetFromFiles(worldFiles, `../cars2/unlock/${name}`)
