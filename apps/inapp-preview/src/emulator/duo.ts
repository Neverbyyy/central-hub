// Копия InApp-WebView-Hub/src/utils/iphoneDuoGeometry.ts (3 ноября 2026) — чтобы зоны Duo в эмуляторе совпадали с InApp.
// Геометрия экранов iPhone Duo в pt — замеры симулятора Xcode 27.1 (safearea.info/iphone-duo).
// Используется эмулятором в дебаг-меню (кнопка DU.), но годится и для вёрстки.
//
// Внешний экран: панч-хол камеры у правого края, Dynamic Island программный и
// разворачивается вертикально вдоль правого края. Левые углы (со стороны петли) — 8 pt.
// Внутренний экран: камера под дисплеем (видна только когда включена), углы 55 pt.
// Логическое разрешение внутреннего — 669×951 @3x, физически ужимается до 1878×2670.

export type DuoPosture = 'folded' | 'unfolded' | 'half'
export type DuoOrientation = 'portrait' | 'left' | 'right'

/** [x, y, width, height] */
export type DuoRect = [number, number, number, number]

export type DuoPose = {
  width: number
  height: number
  /** top-left, top-right, bottom-right, bottom-left */
  radii: [number, number, number, number]
  insets: { top: number, left: number, bottom: number, right: number }
  /** Зона Dynamic Island — системная, контент сюда не ставить */
  island: DuoRect
  /** Панч-хол камеры внешнего экрана */
  camera?: DuoRect
  /** Подэкранная камера внутреннего экрана, перекрывает контент только пока включена */
  innerCamera?: DuoRect
  /** Сгиб в полураскрытом состоянии */
  hinge?: DuoRect
}

const folded: Record<DuoOrientation, DuoPose> = {
  portrait: {
    width: 466,
    height: 678,
    radii: [8, 59, 59, 8],
    insets: { top: 0, left: 0, bottom: 34, right: 84 },
    island: [382, 0, 84, 170],
    camera: [399.67, 29.33, 37, 37]
  },
  left: {
    width: 678,
    height: 466,
    radii: [8, 8, 59, 59],
    insets: { top: 0, left: 0, bottom: 34, right: 84 },
    island: [594, 384, 84, 82],
    camera: [611.67, 399.67, 37, 37]
  },
  right: {
    width: 678,
    height: 466,
    radii: [59, 59, 8, 8],
    insets: { top: 0, left: 84, bottom: 34, right: 0 },
    island: [0, 0, 84, 82],
    camera: [29.33, 29.33, 37, 37]
  }
}

const unfolded: Record<DuoOrientation, DuoPose> = {
  portrait: {
    width: 669,
    height: 951,
    radii: [55, 55, 55, 55],
    insets: { top: 82, left: 0, bottom: 34, right: 0 },
    island: [535, 0, 134, 82],
    innerCamera: [21, 215.67, 37, 58]
  },
  left: {
    width: 951,
    height: 669,
    radii: [55, 55, 55, 55],
    insets: { top: 0, left: 0, bottom: 34, right: 84 },
    island: [867, 0, 84, 120],
    innerCamera: [677.33, 21, 58, 37]
  },
  right: {
    width: 951,
    height: 669,
    radii: [55, 55, 55, 55],
    insets: { top: 0, left: 0, bottom: 34, right: 84 },
    island: [867, 0, 84, 120],
    innerCamera: [215.67, 611, 58, 37]
  }
}

const HINGE: Record<DuoOrientation, DuoRect> = {
  portrait: [0, 455.5, 669, 40],
  left: [455.5, 0, 40, 669],
  right: [455.5, 0, 40, 669]
}

export function getDuoPose(posture: DuoPosture, orientation: DuoOrientation): DuoPose {
  if (posture === 'folded') return folded[orientation]

  const pose = unfolded[orientation]
  return posture === 'half' ? { ...pose, hinge: HINGE[orientation] } : pose
}
