// Иконки дизайн-системы: пути SVG в рамке 24×24, цвет — currentColor (берётся из текста вокруг, то есть из токенов).
// Временный набор под компоненты дня 2 — свои иконки игр нарисует Антон. Рисуем DsIcon, напрямую <svg> не пишем

export interface DsIconShape {
  d: string
  // Залитая фигура; иначе — контур толщиной 2.5 со скруглёнными концами
  fill?: boolean
}

export const icons = {
  'close': { d: 'M6 6l12 12M18 6 6 18' },
  'check': { d: 'M5 12.5l4.5 4.5L19 7.5' },
  'chevron-down': { d: 'M6 9l6 6 6-6' },
  'play': { d: 'M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z', fill: true },
  'star': { d: 'M12 2.8l2.82 5.72 6.31.92-4.57 4.45 1.08 6.29L12 17.21l-5.64 2.97 1.08-6.29L2.87 9.44l6.31-.92z', fill: true }
} satisfies Record<string, DsIconShape>

export type DsIconName = keyof typeof icons
