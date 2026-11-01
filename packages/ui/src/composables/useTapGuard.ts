// Одно действие за cooldownMs: двойной тап и дребезг пальца не вызывают покупку или закрытие дважды.
// То же правило, что useClickCooldown в InApp (800 мс). Без Vue — проверяется unit-тестом на поддельных часах
export const TAP_COOLDOWN_MS = 800

export function useTapGuard(cooldownMs = TAP_COOLDOWN_MS) {
  let lockedUntil = 0

  /** Выполняет action, если с прошлого раза прошло cooldownMs; возвращает, сработало ли. */
  return (action: () => void): boolean => {
    const now = Date.now()
    if (now < lockedUntil) return false
    lockedUntil = now + cooldownMs
    action()
    return true
  }
}
