// Звуки интерактивов — синтез Web Audio: файлов нет, на загрузку страницы не влияет ни байта. Звучат только в ответ на
// нажатие: браузер и ТЗ разрешают звук после тапа, поэтому вызывать только из обработчика события

let context: AudioContext | undefined

function audio(): AudioContext | undefined {
  try {
    const Context = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Context) return undefined
    context ??= new Context()
    if (context.state === 'suspended') void context.resume()
    return context
  } catch {
    return undefined
  }
}

/** Три ноты вверх: получилось. */
export function playChime() {
  const output = audio()
  if (!output) return
  const notes = [{ at: 0, length: 0.16, pitch: 784 }, { at: 0.12, length: 0.16, pitch: 988 }, { at: 0.24, length: 0.4, pitch: 1319 }]
  for (const { at, length, pitch } of notes) {
    const start = output.currentTime + at
    const oscillator = output.createOscillator()
    const gain = output.createGain()
    oscillator.type = 'triangle'
    oscillator.frequency.value = pitch
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(0.12, start + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length)
    oscillator.connect(gain).connect(output.destination)
    oscillator.start(start)
    oscillator.stop(start + length + 0.02)
  }
}

/** Шум воды, пока палец моет машину. Возвращает функцию, которая его выключает. */
export function startWater(): () => void {
  const output = audio()
  if (!output) return () => {}
  const samples = output.sampleRate
  const buffer = output.createBuffer(1, samples, samples)
  const channel = buffer.getChannelData(0)
  for (let index = 0; index < samples; index++) channel[index] = Math.random() * 2 - 1
  const source = output.createBufferSource()
  source.buffer = buffer
  source.loop = true
  const filter = output.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = 1400
  const gain = output.createGain()
  gain.gain.value = 0.035
  source.connect(filter).connect(gain).connect(output.destination)
  source.start()
  return () => source.stop()
}
