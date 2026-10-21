/**
 * WiWU Ruleta de Premios - Efectos de Sonido Web Audio API
 *
 * Incluye:
 * 1. scare: Risa demoníaca desde un archivo MP3.
 * 3. charge: Fanfarria triunfal mágica de victoria con brillos (¡Estira la Carga!).
 * 4. ghost 1: Lamento espectral ondulante (Mejor intenta otro día).
 * 5. ghost 2: Silbido fantasmal armónico ascendente (Te vamos a dar otra oportunidad).
 * 6. wheelTick: Sonido dinámico del tic de la ruleta girando.
 */

export type SoundVariant =
  | 'scare_1'
  | 'scare_2'
  | 'charge'
  | 'charge_file'
  | 'ghost_1'
  | 'ghost_2'
  | 'again_spin_file'
  | 'mummy_zombie'

function getAudioContext(): AudioContext | null {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext
    if (!AudioContextClass) return null
    const ctx = new AudioContextClass()
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }
    return ctx
  } catch {
    return null
  }
}

/** Cierra un AudioContext de forma segura evitando excepciones */
function safeClose(context: AudioContext | null): void {
  if (context && context.state !== 'closed') {
    try {
      context.close().catch(() => {})
    } catch {
      // Ignorar errores al cerrar
    }
  }
}

const scareScreamAudio = new Audio(
  '/dragon-studio-woman-screaming-sfx-screaming-sound-effect-320169.mp3',
)
scareScreamAudio.preload = 'auto'
scareScreamAudio.volume = 0.9
let scarePlaybackId = 0
let scareStopTimer: number | undefined

function seekScreamToStart(): Promise<void> {
  if (
    scareScreamAudio.readyState >= HTMLMediaElement.HAVE_METADATA &&
    !scareScreamAudio.seeking &&
    scareScreamAudio.currentTime < 0.05
  ) {
    return Promise.resolve()
  }

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      scareScreamAudio.removeEventListener('seeked', onSeeked)
      scareScreamAudio.removeEventListener('error', onError)
    }
    const onSeeked = () => {
      if (scareScreamAudio.currentTime >= 0.05) return
      cleanup()
      resolve()
    }
    const onError = () => {
      cleanup()
      reject(scareScreamAudio.error ?? new Error('No se pudo preparar el audio de gritos.'))
    }

    scareScreamAudio.addEventListener('seeked', onSeeked)
    scareScreamAudio.addEventListener('error', onError, { once: true })

    try {
      scareScreamAudio.currentTime = 0
      if (!scareScreamAudio.seeking && scareScreamAudio.currentTime < 0.05) {
        cleanup()
        resolve()
      }
    } catch (error: unknown) {
      cleanup()
      reject(error)
    }
  })
}

const scareAudioReady = new Promise<void>((resolve, reject) => {
  if (scareScreamAudio.readyState >= HTMLMediaElement.HAVE_METADATA) {
    void seekScreamToStart().then(resolve, reject)
    return
  }

  const cleanup = () => {
    scareScreamAudio.removeEventListener('loadedmetadata', onLoaded)
    scareScreamAudio.removeEventListener('error', onError)
  }
  const onLoaded = () => {
    cleanup()
    void seekScreamToStart().then(resolve, reject)
  }
  const onError = () => {
    cleanup()
    reject(scareScreamAudio.error ?? new Error('No se pudo cargar el audio de gritos.'))
  }

  scareScreamAudio.addEventListener('loadedmetadata', onLoaded, { once: true })
  scareScreamAudio.addEventListener('error', onError, { once: true })
  scareScreamAudio.load()
})
scareScreamAudio.addEventListener('ended', () => {
  void seekScreamToStart().catch((error: unknown) => {
    console.error('No se pudo volver a preparar el audio de gritos:', error)
  })
})
void scareAudioReady.catch((error: unknown) => {
  console.error('No se pudo preparar el audio de gritos:', error)
})

const chargeResultAudio = new Audio('/Estira%20la%20carga.mp3')
chargeResultAudio.preload = 'auto'
chargeResultAudio.volume = 0.9

const againSpinResultAudio = new Audio('/Gira%20otra%20vez.mp3')
againSpinResultAudio.preload = 'auto'
againSpinResultAudio.volume = 0.9

const mummyZombieAudio = new Audio('/dragon-studio-zombie-sound-2-357976.mp3')
mummyZombieAudio.preload = 'auto'
mummyZombieAudio.volume = 0.9
let mummyZombieStopTimer: number | undefined
let mummyZombiePlaybackId = 0

function playAudioFile(audio: HTMLAudioElement, description: string): void {
  audio.pause()
  audio.currentTime = 0
  audio.play().catch((error: unknown) => {
    console.error(`No se pudo reproducir el sonido de ${description}:`, error)
  })
}

function playMummyZombieAudio(): void {
  mummyZombiePlaybackId += 1
  const playbackId = mummyZombiePlaybackId
  if (mummyZombieStopTimer !== undefined) {
    window.clearTimeout(mummyZombieStopTimer)
  }

  mummyZombieAudio.pause()
  mummyZombieAudio.currentTime = 0
  mummyZombieAudio.play().then(() => {
    if (playbackId !== mummyZombiePlaybackId) return
    mummyZombieStopTimer = window.setTimeout(() => {
      mummyZombieAudio.pause()
      mummyZombieAudio.currentTime = 0
      mummyZombieStopTimer = undefined
    }, 4000)
  }).catch((error: unknown) => {
    console.error('No se pudo reproducir el sonido de la momia:', error)
  })
}

async function playScreamAudio(): Promise<void> {
  scarePlaybackId += 1
  const playbackId = scarePlaybackId
  if (scareStopTimer !== undefined) {
    window.clearTimeout(scareStopTimer)
    scareStopTimer = undefined
  }
  scareScreamAudio.pause()

  try {
    await scareAudioReady
    if (playbackId !== scarePlaybackId) return
    await seekScreamToStart()
    if (playbackId !== scarePlaybackId) return
    await scareScreamAudio.play()
    scareStopTimer = window.setTimeout(() => {
      if (playbackId !== scarePlaybackId) return
      scareScreamAudio.pause()
      void seekScreamToStart().catch((error: unknown) => {
        console.error('No se pudo reiniciar el audio de gritos:', error)
      })
      scareStopTimer = undefined
    }, 2000)
  } catch (error: unknown) {
    if (playbackId === scarePlaybackId) {
      console.error('No se pudo reproducir el audio de gritos:', error)
    }
  }
}

/** Reproduce el sonido de resultado según la variante */
export function playResultSound(variant: SoundVariant): void {
  if (variant === 'scare_1' || variant === 'scare_2') {
    void playScreamAudio()
    return
  }

  if (variant === 'charge_file') {
    playAudioFile(chargeResultAudio, 'Estira la carga')
    return
  }

  if (variant === 'again_spin_file') {
    playAudioFile(againSpinResultAudio, 'Gira otra vez')
    return
  }

  if (variant === 'mummy_zombie') {
    playMummyZombieAudio()
    return
  }

  const ctx = getAudioContext()
  if (!ctx) return

  const activeCtx: AudioContext = ctx
  const now = activeCtx.currentTime

  switch (variant) {
    case 'charge': {
      // CÁRGALO / ESTIRA LA CARGA: Fanfarria de victoria triunfal con brillos mágicos
      const masterGain = activeCtx.createGain()
      masterGain.connect(activeCtx.destination)
      masterGain.gain.setValueAtTime(0.001, now)
      masterGain.gain.exponentialRampToValueAtTime(0.25, now + 0.04)
      masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8)

      // Acorde mayor triunfal ascendente: C5 (523Hz), E5 (659Hz), G5 (784Hz), C6 (1046Hz)
      const notes = [523.25, 659.25, 783.99, 1046.5]
      notes.forEach((freq, i) => {
        const delay = i * 0.09
        const noteGain = activeCtx.createGain()
        noteGain.connect(masterGain)
        noteGain.gain.setValueAtTime(0.001, now + delay)
        noteGain.gain.exponentialRampToValueAtTime(0.2, now + delay + 0.03)
        noteGain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.9)

        const osc = activeCtx.createOscillator()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(freq, now + delay)
        osc.connect(noteGain)
        osc.start(now + delay)
        osc.stop(now + delay + 0.95)

        // Armónico brillante
        const chime = activeCtx.createOscillator()
        chime.type = 'sine'
        chime.frequency.setValueAtTime(freq * 2, now + delay)
        chime.connect(noteGain)
        chime.start(now + delay)
        chime.stop(now + delay + 0.7)
      })

      window.setTimeout(() => safeClose(activeCtx), 2000)
      break
    }

    case 'ghost_1': {
      // FANTASMA 1: Lamento espectral ondulante (Mejor intenta otro día)
      const masterGain = activeCtx.createGain()
      masterGain.connect(activeCtx.destination)
      masterGain.gain.setValueAtTime(0.001, now)
      masterGain.gain.exponentialRampToValueAtTime(0.18, now + 0.08)
      masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.5)

      // Theremin ondulante (pitch bend)
      const ghost = activeCtx.createOscillator()
      ghost.type = 'sine'
      ghost.frequency.setValueAtTime(480, now)
      ghost.frequency.exponentialRampToValueAtTime(680, now + 0.4)
      ghost.frequency.exponentialRampToValueAtTime(390, now + 0.9)
      ghost.frequency.exponentialRampToValueAtTime(260, now + 1.4)

      // Vibrato con LFO
      const lfo = activeCtx.createOscillator()
      const lfoGain = activeCtx.createGain()
      lfo.frequency.setValueAtTime(4.5, now)
      lfoGain.gain.setValueAtTime(25, now)
      lfo.connect(lfoGain)
      lfoGain.connect(ghost.frequency)
      lfo.start(now)
      lfo.stop(now + 1.5)

      ghost.connect(masterGain)
      ghost.start(now)
      ghost.stop(now + 1.5)

      window.setTimeout(() => safeClose(activeCtx), 1700)
      break
    }

    case 'ghost_2': {
      // FANTASMA 2: Silbido espectral armónico ascendente (Te vamos a dar otra oportunidad)
      const masterGain = activeCtx.createGain()
      masterGain.connect(activeCtx.destination)
      masterGain.gain.setValueAtTime(0.001, now)
      masterGain.gain.exponentialRampToValueAtTime(0.2, now + 0.06)
      masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.6)

      // Dos tonos armónicos espectrales que se elevan
      ;[380, 570].forEach((freq) => {
        const osc = activeCtx.createOscillator()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, now)
        osc.frequency.exponentialRampToValueAtTime(freq * 1.6, now + 0.7)
        osc.frequency.exponentialRampToValueAtTime(freq * 1.2, now + 1.4)
        osc.connect(masterGain)
        osc.start(now)
        osc.stop(now + 1.5)
      })

      // Brillo rítmico
      ;[0, 0.15, 0.3, 0.45].forEach((d) => {
        const ping = activeCtx.createOscillator()
        const pingGain = activeCtx.createGain()
        ping.type = 'triangle'
        ping.frequency.setValueAtTime(950 + d * 400, now + d)
        pingGain.gain.setValueAtTime(0.05, now + d)
        pingGain.gain.exponentialRampToValueAtTime(0.0001, now + d + 0.25)
        ping.connect(pingGain)
        pingGain.connect(masterGain)
        ping.start(now + d)
        ping.stop(now + d + 0.26)
      })

      window.setTimeout(() => safeClose(activeCtx), 1800)
      break
    }
  }
}

/** Reproduce el sonido de la ruleta girando */
export function playWheelSound(): () => void {
  const ctx = getAudioContext()
  if (!ctx) return () => {}

  // Referencia no nula explícita para evitar TS18047 ('ctx' is possibly 'null') en clausuras anidadas
  const activeCtx: AudioContext = ctx
  const startedAt = performance.now()
  let timer: number | undefined
  let stopped = false

  function tick() {
    if (stopped) return
    const elapsed = performance.now() - startedAt
    if (elapsed >= 4100) {
      safeClose(activeCtx)
      return
    }

    const osc = activeCtx.createOscillator()
    const gain = activeCtx.createGain()
    osc.type = 'square'
    osc.frequency.setValueAtTime(1050 - Math.min(elapsed / 7, 430), activeCtx.currentTime)
    gain.gain.setValueAtTime(0.045, activeCtx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, activeCtx.currentTime + 0.025)
    osc.connect(gain)
    gain.connect(activeCtx.destination)
    osc.start()
    osc.stop(activeCtx.currentTime + 0.03)

    const progress = elapsed / 4100
    const nextTick = 45 + Math.pow(progress, 2.4) * 230
    timer = window.setTimeout(tick, nextTick)
  }

  tick()

  return () => {
    stopped = true
    if (timer) window.clearTimeout(timer)
    safeClose(activeCtx)
  }
}
