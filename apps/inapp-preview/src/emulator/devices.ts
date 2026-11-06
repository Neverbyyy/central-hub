// Устройства эмулятора: логический размер вебвью в альбомной ориентации (портрет — поворотом) и скругление экрана.
// Размеры — как у макетов (667, 844, 1024) и у телефонов, где экран чаще всего ломается: iPhone SE (самый низкий),
// Android среднего класса, iPad mini. iPhone Duo — позы из InApp (duo.ts) с зонами safe area, Island и камеры
import { getDuoPose, type DuoPose } from './duo'

export type Orientation = 'landscape' | 'portrait'

export interface Device {
  id: string
  name: string
  // Альбомная ориентация, pt
  width: number
  height: number
  radius: number
  // Позы Duo: альбом L и R отличаются стороной камеры, портрет — свой
  duo?: { posture: 'folded' | 'unfolded' | 'half', side: 'left' | 'right' }
  // Без рамки: экран занимает всё место, размер и поворот — настоящие. На телефоне так он и смотрится
  fill?: boolean
}

export const DEVICES: Device[] = [
  { id: 'here', name: 'Этот экран, без рамки', width: 0, height: 0, radius: 0, fill: true },
  { id: 'se', name: 'iPhone SE (1-е) 568×320', width: 568, height: 320, radius: 0 },
  { id: 'iphone8', name: 'iPhone 8 / SE 667×375 — макет', width: 667, height: 375, radius: 0 },
  { id: 'android', name: 'Android 800×360', width: 800, height: 360, radius: 24 },
  { id: 'iphone', name: 'iPhone 844×390 — макет', width: 844, height: 390, radius: 47 },
  { id: 'promax', name: 'iPhone Pro Max 932×430', width: 932, height: 430, radius: 55 },
  { id: 'ipad', name: 'iPad 1024×768 — макет', width: 1024, height: 768, radius: 18 },
  { id: 'ipadmini', name: 'iPad mini 1133×744', width: 1133, height: 744, radius: 22 },
  // Не устройство: так экран смотрят в окне браузера — между размерами макета
  { id: 'tall', name: 'Окно браузера 901×861', width: 901, height: 861, radius: 0 },
  { id: 'duo-folded-l', name: 'iPhone Duo сложен, альбом L', width: 678, height: 466, radius: 0, duo: { posture: 'folded', side: 'left' } },
  { id: 'duo-folded-r', name: 'iPhone Duo сложен, альбом R', width: 678, height: 466, radius: 0, duo: { posture: 'folded', side: 'right' } },
  { id: 'duo-unfolded', name: 'iPhone Duo разложен 951×669', width: 951, height: 669, radius: 0, duo: { posture: 'unfolded', side: 'left' } },
  { id: 'duo-unfolded-r', name: 'iPhone Duo разложен, альбом R', width: 951, height: 669, radius: 0, duo: { posture: 'unfolded', side: 'right' } },
  { id: 'duo-half', name: 'iPhone Duo полураскрыт, со сгибом', width: 951, height: 669, radius: 0, duo: { posture: 'half', side: 'left' } }
]

export const findDevice = (id: string | null) => DEVICES.find(device => device.id === id) ?? DEVICES.find(device => device.id === 'iphone')!

export interface Screen {
  width: number
  height: number
  // top-left, top-right, bottom-right, bottom-left
  radii: [number, number, number, number]
  duo?: DuoPose
  fill?: boolean
}

/** Размер вебвью в выбранной ориентации; у Duo — его поза целиком (с зонами). */
export function screenOf(device: Device, orientation: Orientation): Screen {
  if (device.fill) return { width: innerWidth, height: innerHeight, radii: [0, 0, 0, 0], fill: true }
  if (device.duo) {
    const pose = getDuoPose(device.duo.posture, orientation === 'portrait' ? 'portrait' : device.duo.side)
    return { width: pose.width, height: pose.height, radii: pose.radii, duo: pose }
  }
  const [width, height] = orientation === 'portrait' ? [device.height, device.width] : [device.width, device.height]
  return { width, height, radii: [device.radius, device.radius, device.radius, device.radius] }
}
