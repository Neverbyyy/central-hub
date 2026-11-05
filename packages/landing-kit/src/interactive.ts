import { ref } from 'vue'

// Живая анимация лендинга — украшение, и платить за неё зависшей страницей нельзя. Без видеокарты WebGL рисует процессор:
// сцена /cars2-go занимала почти все ядра и давала 10 кадров в секунду. Решение общее для страницы: сцена не потянула —
// шарики в финише тоже не запускаются

/** Машина не тянет живую анимацию: на всех интерактивах страницы остаётся картинка. */
export const interactiveOff = ref(false)

const SOFTWARE_RENDERER = /swiftshader|llvmpipe|softpipe|software|basic render/i

// Первые кадры дорогие (сборка шейдеров), их не считаем
const WARMUP_MS = 500
const WINDOW_MS = 2000
// Меньше 30: в режиме энергосбережения iPhone сам ограничивает кадры тридцатью, и это не слабая машина
const MIN_FPS = 24

/** Рендерер WebGL программный: рисует процессор, а не видеокарта. */
export const isSoftwareRenderer = (renderer: string) => SOFTWARE_RENDERER.test(renderer)

// Нужны оба сигнала: failIfMajorPerformanceCaveat ловит не всё (SwiftShader, включённый флагом, он пропускает), а имя
// рендерера браузер может и не отдать — тогда остаётся замер кадров
function detectHardwareWebGL(): boolean {
  const gl = document.createElement('canvas').getContext('webgl2', { failIfMajorPerformanceCaveat: true })
  if (!gl) return false
  const info = gl.getExtension('WEBGL_debug_renderer_info')
  const renderer = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER))
  // Контекстов WebGL на страницу мало: временный освобождаем сразу
  gl.getExtension('WEBGL_lose_context')?.loseContext()
  return !isSoftwareRenderer(renderer)
}

let hardware: boolean | undefined

/** Есть ли WebGL на видеокарте. Временный контекст создаётся один раз на страницу. */
export function hasHardwareWebGL(): boolean {
  if (hardware === undefined) hardware = detectHardwareWebGL()
  return hardware
}

let watched = false

/**
 * Запущенная анимация успевает: иначе interactiveOff. Ловит то, что не видно по имени рендерера: слабую видеокарту,
 * удалённый рабочий стол, виртуальную машину. Замер один на страницу и через 2,5 с заканчивается сам.
 */
export function watchFrameRate(): void {
  if (watched) return
  watched = true

  let warmupEnd: number | undefined
  let windowStart: number | undefined
  let frames = 0

  // Скрытая вкладка кадров не рисует, и это не тормоза: считаем заново
  const restart = () => {
    warmupEnd = undefined
    windowStart = undefined
  }

  const tick = (now: number) => {
    if (warmupEnd === undefined) warmupEnd = now + WARMUP_MS
    if (now >= warmupEnd) {
      if (windowStart === undefined) {
        windowStart = now
        frames = 0
      } else {
        frames++
      }
      const elapsed = now - windowStart
      if (elapsed >= WINDOW_MS) {
        document.removeEventListener('visibilitychange', restart)
        if (frames * 1000 / elapsed < MIN_FPS) interactiveOff.value = true
        return
      }
    }
    requestAnimationFrame(tick)
  }

  document.addEventListener('visibilitychange', restart)
  requestAnimationFrame(tick)
}
