/**
 * WiWU Ruleta de Premios - Sorteo y probabilidades
 *
 * Los seis sectores muestran 2 Power Banks, 2 cables, 1 susto y 1 giro extra.
 * Las probabilidades de resultado son ponderadas y el sorteo de producción
 * usa un servicio compartido para controlar rachas entre dispositivos.
 */

import { Prize, PrizeKind, prizes } from '../App'

export const FIRST_SPIN_PRIZE_PROBABILITY = 0.3
export const EXTRA_SPIN_PROBABILITY = 0.1
export const EXTRA_SPIN_PRIZE_PROBABILITY = 0.1

export interface RaffleResult {
  prizeIndex: number
  prize: Prize
  kind: PrizeKind
  jitterAngle: number
}

function choosePrizeKind(): 'charge' | 'trick' {
  return Math.random() < 0.5 ? 'charge' : 'trick'
}

function choosePrizeIndex(kind: 'charge' | 'trick'): number {
  const matchingIndices = prizes
    .map((prize, index) => ({ prize, index }))
    .filter(({ prize }) => prize.kind === kind)
    .map(({ index }) => index)
  return matchingIndices[Math.floor(Math.random() * matchingIndices.length)]
}

/**
 * Sortea resultados ponderados y devuelve un sector visual compatible.
 * El giro normal tiene 30% de premio, 10% de giro extra y 60% de susto.
 * En el giro extra, hay 10% de premio y 90% de susto.
 */
export function drawPrize(
  forcedKind?: PrizeKind | 'random',
  allowAgain: boolean = true
): RaffleResult {
  let selectedIndex: number
  if (forcedKind && forcedKind !== 'random') {
    const forcedMatches = prizes
      .map((prize, index) => ({ prize, index }))
      .filter(({ prize }) => prize.kind === forcedKind)
      .map(({ index }) => index)
    selectedIndex =
      forcedMatches.length > 0 && (allowAgain || forcedKind !== 'again_spin')
        ? forcedMatches[Math.floor(Math.random() * forcedMatches.length)]
        : choosePrizeIndex(choosePrizeKind())
  } else {
    const roll = Math.random()
    const prizeProbability = allowAgain
      ? FIRST_SPIN_PRIZE_PROBABILITY
      : EXTRA_SPIN_PRIZE_PROBABILITY
    const extraSpinBoundary = allowAgain
      ? prizeProbability + EXTRA_SPIN_PROBABILITY
      : prizeProbability

    if (roll < prizeProbability) {
      selectedIndex = choosePrizeIndex(choosePrizeKind())
    } else if (allowAgain && roll < extraSpinBoundary) {
      selectedIndex = prizes.findIndex((prize) => prize.kind === 'again_spin')
    } else {
      selectedIndex = prizes.findIndex((prize) => prize.kind === 'scare')
    }
  }

  const prize = prizes[selectedIndex]
  const jitterAngle = Math.floor(Math.random() * 28) - 14

  return {
    prizeIndex: selectedIndex,
    prize,
    kind: prize.kind,
    jitterAngle,
  }
}

export async function drawPrizeFromSharedBackend(
  allowAgain: boolean,
  requestId: string
): Promise<RaffleResult> {
  const response = await fetch('/.netlify/functions/draw-prize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ allowAgain, requestId }),
  })

  let body: unknown
  try {
    body = await response.json()
  } catch {
    throw new Error('El servicio de sorteo devolvió una respuesta inválida.')
  }

  if (!response.ok) {
    const message =
      typeof body === 'object' &&
      body !== null &&
      'error' in body &&
      typeof body.error === 'string'
        ? body.error
        : 'No se pudo completar el sorteo compartido.'
    throw new Error(message)
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    !('prizeIndex' in body) ||
    typeof body.prizeIndex !== 'number' ||
    !Number.isInteger(body.prizeIndex) ||
    !('kind' in body) ||
    typeof body.kind !== 'string'
  ) {
    throw new Error('El servicio de sorteo devolvió datos incompletos.')
  }

  const prize = prizes[body.prizeIndex]
  if (!prize || prize.kind !== body.kind) {
    throw new Error('El servicio de sorteo devolvió un resultado desconocido.')
  }

  return {
    prizeIndex: body.prizeIndex,
    prize,
    kind: prize.kind,
    jitterAngle: Math.floor(Math.random() * 28) - 14,
  }
}

/**
 * Calcula la rotación matemática continua de la ruleta para
 * que apunte a la casilla ganadora sin desfasarse en múltiples giros.
 */
export function calculateNextRotation(
  currentRotation: number,
  prizeIndex: number,
  jitterAngle: number = 0,
  extraSpins: number = 6
): number {
  const currentBase = Math.floor(currentRotation / 360) * 360
  const targetAngle = 360 - prizeIndex * 60
  return currentBase + 360 * extraSpins + targetAngle + jitterAngle
}

/** Simula participantes con un giro normal y como máximo un giro extra. */
export function simulateRaffleDraws(iterations: number = 100): {
  distribution: Record<PrizeKind, number>
  totalSpins: number
  bonusSpins: number
  participantsWithPrize: number
} {
  const distribution: Record<PrizeKind, number> = {
    charge: 0,
    trick: 0,
    again_spin: 0,
    scare: 0,
  }

  let totalSpins = 0
  let bonusSpins = 0
  let participantsWithPrize = 0

  for (let session = 0; session < iterations; session++) {
    const firstSpin = drawPrize()
    totalSpins++
    let finalKind = firstSpin.kind

    if (firstSpin.kind === 'again_spin') {
      bonusSpins++
      const extraSpin = drawPrize(undefined, false)
      totalSpins++
      finalKind = extraSpin.kind
    }

    distribution[finalKind]++
    if (finalKind === 'charge' || finalKind === 'trick') {
      participantsWithPrize++
    }
  }

  return { distribution, totalSpins, bonusSpins, participantsWithPrize }
}
