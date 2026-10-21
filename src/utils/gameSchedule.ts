/**
 * WiWU Ruleta de Premios - Control de Horarios y Disponibilidad
 *
 * Reglas de juego:
 * 1. Días habilitados: Solo Martes y Miércoles.
 * 2. Horario: De 8:00 AM a 8:00 PM (08:00 a 20:00).
 * 3. Límite de evento: Hasta el 31 de Octubre (23:59:59). Pasada esa fecha: Evento finalizado.
 * 4. Límite por dispositivo: 1 tirada al día, más un giro extra si sale.
 */

export const EVENT_YEAR = 2026
export const DAILY_SPIN_LIMIT = 1

export interface DailyPlayState {
  spinsRemaining: number
  bonusSpinGranted: boolean
  completed: boolean
}

export type GameScheduleStatus =
  | 'OPEN'
  | 'EVENT_ENDED'
  | 'CLOSED_DAY'
  | 'CLOSED_HOURS'
  | 'ALREADY_PLAYED'

export interface GameScheduleCheck {
  status: GameScheduleStatus
  isOpen: boolean
  canPlay: boolean
  badge: string
  title: string
  subtitle: string
  detailText: string
  nextOpeningText: string
}

/** Formato YYYY-MM-DD para almacenamiento local */
export function getTodayKey(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Verifica si el evento ya superó el 31 de octubre */
export function isEventEnded(date: Date = new Date(), eventYear: number = EVENT_YEAR): boolean {
  // Octubre es el mes 9 (0-indexed). 31 de octubre a las 23:59:59.999
  const targetYear = Math.max(eventYear, date.getFullYear())
  const eventEnd = new Date(targetYear, 9, 31, 23, 59, 59, 999)
  return date.getTime() > eventEnd.getTime()
}

/** Verifica si hoy es Martes (2) o Miércoles (3) */
export function isAllowedDay(date: Date = new Date()): boolean {
  const day = date.getDay()
  return day === 2 || day === 3
}

/** Verifica si la hora actual está entre 8:00 AM (08:00) y 8:00 PM (20:00) */
export function isAllowedHour(date: Date = new Date()): boolean {
  const hours = date.getHours()
  const minutes = date.getMinutes()
  if (hours < 8) return false
  if (hours > 20) return false
  if (hours === 20 && minutes > 0) return false
  return true
}

const STORAGE_KEY_PLAYED = 'wiwu_wheel_last_play_date'
const STORAGE_KEY_PRIZE = 'wiwu_wheel_last_prize'
const STORAGE_KEY_TIME = 'wiwu_wheel_last_play_time'
const STORAGE_KEY_DAILY_PLAY = 'wiwu_wheel_daily_play_state'
const DAILY_PLAY_STATE_VERSION = 2

function saveDailyPlayState(date: Date, state: DailyPlayState): void {
  try {
    localStorage.setItem(
      STORAGE_KEY_DAILY_PLAY,
      JSON.stringify({ version: DAILY_PLAY_STATE_VERSION, date: getTodayKey(date), ...state })
    )
  } catch {
    // Almacenamiento restringido o privado
  }
}

/** Obtiene las oportunidades diarias y migra el formato anterior de dos giros normales. */
export function getDailyPlayState(date: Date = new Date()): DailyPlayState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_DAILY_PLAY)
    if (stored) {
      const parsed: unknown = JSON.parse(stored)
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        'version' in parsed &&
        parsed.version === DAILY_PLAY_STATE_VERSION &&
        'date' in parsed &&
        parsed.date === getTodayKey(date) &&
        'spinsRemaining' in parsed &&
        typeof parsed.spinsRemaining === 'number' &&
        Number.isInteger(parsed.spinsRemaining) &&
        'bonusSpinGranted' in parsed &&
        typeof parsed.bonusSpinGranted === 'boolean' &&
        'completed' in parsed &&
        typeof parsed.completed === 'boolean'
      ) {
        return {
          spinsRemaining: Math.max(0, parsed.spinsRemaining),
          bonusSpinGranted: parsed.bonusSpinGranted,
          completed: parsed.completed,
        }
      }

      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        'date' in parsed &&
        parsed.date === getTodayKey(date) &&
        'spinsRemaining' in parsed &&
        typeof parsed.spinsRemaining === 'number' &&
        Number.isInteger(parsed.spinsRemaining) &&
        'bonusSpinGranted' in parsed &&
        typeof parsed.bonusSpinGranted === 'boolean' &&
        'completed' in parsed &&
        typeof parsed.completed === 'boolean'
      ) {
        const migrated =
          parsed.completed || parsed.spinsRemaining <= 1
            ? { spinsRemaining: 0, bonusSpinGranted: parsed.bonusSpinGranted, completed: true }
            : {
                spinsRemaining: parsed.bonusSpinGranted ? 1 : DAILY_SPIN_LIMIT,
                bonusSpinGranted: parsed.bonusSpinGranted,
                completed: false,
              }
        saveDailyPlayState(date, migrated)
        return migrated
      }
    }

    if (localStorage.getItem(STORAGE_KEY_PLAYED) === getTodayKey(date)) {
      const migrated = { spinsRemaining: 0, bonusSpinGranted: false, completed: true }
      saveDailyPlayState(date, migrated)
      return migrated
    }
  } catch {
    // Almacenamiento restringido o privado
  }

  return {
    spinsRemaining: DAILY_SPIN_LIMIT,
    bonusSpinGranted: false,
    completed: false,
  }
}

/** Consume y persiste una de las oportunidades disponibles antes de iniciar el giro. */
export function consumeDailySpin(date: Date = new Date()): DailyPlayState | null {
  const state = getDailyPlayState(date)
  if (state.completed || state.spinsRemaining <= 0) return null

  const updated = { ...state, spinsRemaining: state.spinsRemaining - 1 }
  saveDailyPlayState(date, updated)
  return updated
}

/** Añade como máximo un giro extra durante el día. */
export function grantDailyBonusSpin(date: Date = new Date()): DailyPlayState {
  const state = getDailyPlayState(date)
  if (state.bonusSpinGranted || state.completed) return state

  const updated = {
    ...state,
    spinsRemaining: state.spinsRemaining + 1,
    bonusSpinGranted: true,
  }
  saveDailyPlayState(date, updated)
  return updated
}

function completeDailyPlay(date: Date): DailyPlayState {
  const updated = {
    ...getDailyPlayState(date),
    spinsRemaining: 0,
    completed: true,
  }
  saveDailyPlayState(date, updated)
  return updated
}

/** Comprueba si el dispositivo ya jugó hoy */
export function hasPlayedToday(date: Date = new Date()): boolean {
  const state = getDailyPlayState(date)
  return state.completed || state.spinsRemaining <= 0
}

/** Obtiene información del último premio registrado hoy */
export function getLastPlayedInfo(): { date: string | null; prize: string | null; time: string | null } {
  try {
    return {
      date: localStorage.getItem(STORAGE_KEY_PLAYED),
      prize: localStorage.getItem(STORAGE_KEY_PRIZE),
      time: localStorage.getItem(STORAGE_KEY_TIME),
    }
  } catch {
    return { date: null, prize: null, time: null }
  }
}

/** Registra que el dispositivo jugó hoy */
export function recordLastPlayedInfo(date: Date = new Date(), prizeLabel?: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_PLAYED, getTodayKey(date))
    if (prizeLabel) {
      localStorage.setItem(STORAGE_KEY_PRIZE, prizeLabel)
    }
    localStorage.setItem(
      STORAGE_KEY_TIME,
      date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    )
  } catch {
    // Almacenamiento restringido o privado
  }
}

/** Registra el resultado y termina las oportunidades del dispositivo por hoy. */
export function recordPlayedToday(date: Date = new Date(), prizeLabel?: string): void {
  completeDailyPlay(date)
  recordLastPlayedInfo(date, prizeLabel)
}

/** Reinicia el registro del dispositivo (útil para pruebas y desarrollo) */
export function resetPlayedToday(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_PLAYED)
    localStorage.removeItem(STORAGE_KEY_PRIZE)
    localStorage.removeItem(STORAGE_KEY_TIME)
    localStorage.removeItem(STORAGE_KEY_DAILY_PLAY)
  } catch {
    // Ignorar
  }
}

/** Retorna un texto descriptivo de la próxima apertura */
export function getNextOpenDateDescription(date: Date = new Date()): string {
  const day = date.getDay()
  const hours = date.getHours()
  const minutes = date.getMinutes()
  const isPastClosing = hours > 20 || (hours === 20 && minutes > 0)
  const isBeforeOpening = hours < 8

  if (day === 2) {
    // Martes
    if (isBeforeOpening) return 'Abre hoy a las 8:00 AM'
    if (isPastClosing) return 'Abre mañana miércoles a las 8:00 AM'
    return '¡Abierto ahora hasta las 8:00 PM!'
  }
  if (day === 3) {
    // Miércoles
    if (isBeforeOpening) return 'Abre hoy a las 8:00 AM'
    if (isPastClosing) return 'Próxima apertura: Próximo martes a las 8:00 AM'
    return '¡Abierto ahora hasta las 8:00 PM!'
  }
  if (day === 0) return 'Próxima apertura: Este martes a las 8:00 AM'
  if (day === 1) return 'Próxima apertura: Mañana martes a las 8:00 AM'
  if (day === 4) return 'Próxima apertura: Próximo martes a las 8:00 AM'
  if (day === 5) return 'Próxima apertura: Próximo martes a las 8:00 AM'
  if (day === 6) return 'Próxima apertura: Próximo martes a las 8:00 AM'
  return 'Martes y miércoles de 8:00 AM a 8:00 PM'
}

/**
 * Función principal que evalúa la disponibilidad del juego
 * para una fecha y hora dadas (o actual por defecto).
 */
export function checkGameSchedule(date: Date = new Date()): GameScheduleCheck {
  const nextOpening = getNextOpenDateDescription(date)

  // 1. Verificar si el evento finalizó (después del 31 de octubre)
  if (isEventEnded(date)) {
    return {
      status: 'EVENT_ENDED',
      isOpen: false,
      canPlay: false,
      badge: 'EVENTO FINALIZADO',
      title: '¡EVENTO FINALIZADO!',
      subtitle:
        'La temporada de la Ruleta de Premios de Halloween ha llegado a su fin el 31 de octubre.',
      detailText:
        '¡Muchas gracias a todos los que participaron y celebraron con WiWU! Síguenos para enterarte de nuestros próximos eventos y sorpresas.',
      nextOpeningText: 'Campaña de Halloween concluida',
    }
  }

  // 2. Verificar día de la semana (solo Martes y Miércoles)
  if (!isAllowedDay(date)) {
    return {
      status: 'CLOSED_DAY',
      isOpen: false,
      canPlay: false,
      badge: 'SOLO MARTES Y MIÉRCOLES',
      title: 'RULETA CERRADA HOY',
      subtitle:
        'Nuestra ruleta misteriosa de Halloween solo está disponible los martes y miércoles.',
      detailText:
        'Ven a jugar los martes y miércoles de 8:00 AM a 8:00 PM (hasta el 31 de octubre). ¡Guarda la fecha y prueba tu suerte!',
      nextOpeningText: nextOpening,
    }
  }

  // 3. Verificar horario (8:00 AM a 8:00 PM)
  if (!isAllowedHour(date)) {
    const isEarly = date.getHours() < 8
    return {
      status: 'CLOSED_HOURS',
      isOpen: false,
      canPlay: false,
      badge: isEarly ? 'APERTURA 8:00 AM' : 'HORARIO CERRADO',
      title: isEarly ? 'ABRIMOS A LAS 8:00 AM' : 'RULETA CERRADA POR HOY',
      subtitle:
        'El horario de juego es de 8:00 AM a 8:00 PM. ¡Te esperamos en ese intervalo para girar!',
      detailText: isEarly
        ? 'Los espíritus de Halloween están descansando. La ruleta iniciará puntualmente a las 8:00 AM.'
        : 'La jornada de hoy ha culminado a las 8:00 PM. Vuelve mañana o en nuestro próximo día habilitado a las 8:00 AM.',
      nextOpeningText: nextOpening,
    }
  }

  // 4. Verificar si el dispositivo ya jugó hoy
  if (hasPlayedToday(date)) {
    return {
      status: 'ALREADY_PLAYED',
      isOpen: true,
      canPlay: false,
      badge: 'LÍMITE DIARIO ALCANZADO',
      title: '¡YA JUGASTE HOY!',
      subtitle:
        'Ya usaste todas tus oportunidades de hoy.\nVuelve en nuestro próximo día de juego.',
      detailText:
        'Cada dispositivo tiene 1 giro al día y puede obtener uno extra si la ruleta lo concede. Vuelve el próximo martes o miércoles de 8:00 AM a 8:00 PM.',
      nextOpeningText: nextOpening,
    }
  }

  // 5. Todo en orden: juego disponible
  return {
    status: 'OPEN',
    isOpen: true,
    canPlay: true,
    badge: '¡RULETA ABIERTA!',
    title: '¿TE ATREVES A JUGAR?',
    subtitle: 'Tienes 1 giro disponible hoy de 8:00 AM a 8:00 PM.',
    detailText:
      'Cada dispositivo tiene 1 giro al día. Si la ruleta concede “GIRA OTRA VEZ”, se añade un giro extra.',
    nextOpeningText: 'Abierto hoy hasta las 8:00 PM',
  }
}
