import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import {
  checkGameSchedule,
  consumeDailySpin,
  getDailyPlayState,
  grantDailyBonusSpin,
  GameScheduleCheck,
  DailyPlayState,
  recordLastPlayedInfo,
  recordPlayedToday,
} from './utils/gameSchedule'
import {
  drawPrize,
  drawPrizeFromSharedBackend,
  calculateNextRotation,
  RaffleResult,
} from './utils/prizeRaffle'
import {
  playResultSound,
  playWheelSound,
  SoundVariant,
} from './utils/audioEffects'
import { ScheduleStatusScreen } from './components/ScheduleStatusScreen'
import {
  ScheduleDevSimulator,
  SimulationPreset,
} from './components/ScheduleDevSimulator'

type Screen = 'qr' | 'play' | 'wheel' | 'result'
export type PrizeKind = 'scare' | 'charge' | 'trick' | 'again_spin'

export type Prize = {
  id: number
  label: string
  shortLabel: string
  kind: PrizeKind
  soundVariant: SoundVariant
  color: string
}

export const prizes: Prize[] = [
  { id: 0, label: '¿¡SUSTO!?', shortLabel: '?', kind: 'scare', soundVariant: 'scare_1', color: '#e7293f' },
  { id: 1, label: '¿CÁRGALO?', shortLabel: '?', kind: 'charge', soundVariant: 'charge_file', color: '#8a2be2' },
  { id: 2, label: '¿TRUCO?', shortLabel: '?', kind: 'trick', soundVariant: 'mummy_zombie', color: '#ff7518' },
  { id: 3, label: '¿CÁRGALO?', shortLabel: '?', kind: 'charge', soundVariant: 'charge_file', color: '#3c096c' },
  { id: 4, label: '¿TRUCO?', shortLabel: '?', kind: 'trick', soundVariant: 'mummy_zombie', color: '#ff7518' },
  { id: 5, label: '¿GIRA OTRA VEZ?', shortLabel: '?', kind: 'again_spin', soundVariant: 'again_spin_file', color: '#8a2be2' },
]

const wheelGradient = `conic-gradient(from -30deg, ${prizes
  .map((prize, index) => `${prize.color} ${index * 60}deg ${(index + 1) * 60}deg`)
  .join(', ')})`

function PumpkinIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 80 80" aria-hidden="true">
      <path d="M38 18c-2-8 3-12 8-12-1 5 2 8 7 9" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
      <path d="M41 17C18 7 5 26 10 49c5 24 23 23 31 18 8 5 27 6 31-18 4-23-8-42-31-32Z" fill="#ff7a1a" stroke="currentColor" strokeWidth="4" />
      <path d="m21 40 10-6-3 11-7-5Zm40 0-10-6 3 11 7-5ZM25 54c10 8 22 8 32 0-4 13-27 14-32 0Z" fill="currentColor" />
      <path d="M41 20c-8 11-8 35 0 45M27 21c-5 11-5 31 1 42M55 21c5 11 5 31-1 42" fill="none" stroke="#cc4d10" strokeWidth="3" opacity=".7" />
    </svg>
  )
}

function Cobweb({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  const angles = [0, 15, 30, 45, 60, 75, 90].map((deg) => (deg * Math.PI) / 180)
  const rings = [35, 72, 112, 156, 204]

  return (
    <svg
      className={`cobweb ${className}`}
      style={style}
      viewBox="0 0 210 210"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {angles.map((rad, i) => {
        const x2 = (210 * Math.cos(rad)).toFixed(1)
        const y2 = (210 * Math.sin(rad)).toFixed(1)
        return <line key={i} x1="0" y1="0" x2={x2} y2={y2} stroke="currentColor" strokeWidth="1.2" opacity="0.65" />
      })}
      {rings.map((r, ringIdx) => {
        let d = ''
        for (let i = 0; i < angles.length; i++) {
          const x = (r * Math.cos(angles[i])).toFixed(1)
          const y = (r * Math.sin(angles[i])).toFixed(1)
          if (i === 0) {
            d += `M ${x} ${y}`
          } else {
            const mid = (angles[i - 1] + angles[i]) / 2
            const sag = r * 0.86
            const cx = (sag * Math.cos(mid)).toFixed(1)
            const cy = (sag * Math.sin(mid)).toFixed(1)
            d += ` Q ${cx} ${cy}, ${x} ${y}`
          }
        }
        return <path key={ringIdx} d={d} stroke="currentColor" strokeWidth="1.2" opacity="0.6" fill="none" />
      })}
    </svg>
  )
}

function WebSpider({ className = '' }: { className?: string }) {
  return (
    <svg className={`web-spider ${className}`} viewBox="0 0 64 110" aria-hidden="true">
      <defs>
        <linearGradient id="spider-shell" x1="10" y1="30" x2="48" y2="78" gradientUnits="userSpaceOnUse">
          <stop stopColor="#51404f" />
          <stop offset=".42" stopColor="#1b1422" />
          <stop offset="1" stopColor="#08070d" />
        </linearGradient>
        <linearGradient id="spider-mark" x1="32" y1="51" x2="32" y2="69" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ff7778" />
          <stop offset="1" stopColor="#9f102b" />
        </linearGradient>
      </defs>
      <path d="M32 0v31" stroke="#d8d2e1" strokeWidth="1.3" opacity=".75" />
      <g fill="none" stroke="#0a080e" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m27 40-9-7-9 2-5-8m21 19-12-2-8 7-3 9m22-2-12 4-5 10-8 4m24-1-8 9-1 10-7 5" />
        <path d="m37 40 9-7 9 2 5-8M37 44l12-2 8 7 3 9m-22-2 12 4 5 10 8 4m-24-1 8 9 1 10 7 5" />
      </g>
      <g fill="none" stroke="#786779" strokeWidth="1" strokeLinecap="round" opacity=".8">
        <path d="m27 40-9-7-9 2-5-8m21 19-12-2-8 7-3 9m22-2-12 4-5 10-8 4m24-1-8 9-1 10-7 5" />
        <path d="m37 40 9-7 9 2 5-8M37 44l12-2 8 7 3 9m-22-2 12 4 5 10 8 4m-24-1 8 9 1 10 7 5" />
      </g>
      <ellipse cx="32" cy="59" rx="12" ry="17" fill="url(#spider-shell)" stroke="#796775" strokeWidth="1.4" />
      <path d="m32 49 4 6-4 4-4-4 4-6Zm0 11 4 5-4 7-4-7 4-5Z" fill="url(#spider-mark)" />
      <path d="M25 39c0-5 3-8 7-8s7 3 7 8-3 8-7 8-7-3-7-8Z" fill="url(#spider-shell)" stroke="#8b7887" strokeWidth="1.4" />
      <path d="m26 45-3 5m15-5 3 5" stroke="#d8bdc9" strokeWidth="1.5" strokeLinecap="round" />
      <g fill="#ff475d">
        <circle cx="28" cy="38" r="1.4" />
        <circle cx="32" cy="36.5" r="1.5" />
        <circle cx="36" cy="38" r="1.4" />
      </g>
      <path d="M27 53c1.5-3 3.5-4 5-4" fill="none" stroke="#cbb9c9" strokeWidth="1" opacity=".65" />
    </svg>
  )
}

function SoundIcon({ muted }: { muted: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 9v6h4l5 4V5L9 9H5Z" fill="currentColor" />
      {muted ? (
        <path d="m18 9 4 6m0-6-4 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      ) : (
        <path d="M17 8c2 2 2 6 0 8m2-11c4 4 4 10 0 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      )}
    </svg>
  )
}

function Brand() {
  return (
    <div className="brand" aria-label="WiWU">
      <img
        src="/img/Logo - WiWU - Blanco.png"
        alt="WiWU"
        className="brand-logo"
        draggable={false}
      />
    </div>
  )
}

function Header({ muted, onToggleSound }: { muted: boolean; onToggleSound: () => void }) {
  return (
    <header className="header">
      <Brand />
      <button className="sound-button" onClick={onToggleSound} aria-label={muted ? 'Activar sonido' : 'Silenciar sonido'}>
        <SoundIcon muted={muted} />
      </button>
    </header>
  )
}

function QrScreen({
  onPreview,
  scheduleCheck,
}: {
  onPreview: () => void
  scheduleCheck: GameScheduleCheck
}) {
  const [qr, setQr] = useState('')
  const playUrl = `${window.location.origin}${window.location.pathname}?screen=play`

  useEffect(() => {
    QRCode.toDataURL(playUrl, {
      width: 420,
      margin: 1,
      errorCorrectionLevel: 'H',
      color: { dark: '#150729', light: '#ffffff' },
    }).then(setQr)
  }, [playUrl])

  return (
    <main className="qr-screen">
      <div className="cobweb-container cobweb-container--fullscreen" aria-hidden="true">
        <Cobweb className="cobweb-tr" />
        <Cobweb className="cobweb-bl" />
        <WebSpider />
      </div>
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <div className="qr-copy">
        <div className="eyebrow"><span /> EXPERIENCIA HALLOWEEN 2026</div>
        <h1>
          ¡Gira <span>y gana!</span>
          <PumpkinIcon className="title-pumpkin" />
        </h1>
        <p>Escanea, gira y descubre qué sorpresa<br />tiene WIWU preparada para ti.</p>
        <div className="steps">
          {['Escanea', 'Gira', 'Descubre'].map((step, index) => (
            <div className="step" key={step}><b>0{index + 1}</b><span>{step}</span></div>
          ))}
        </div>

        {/* Badge descriptivo de los días de juego */}
        <div className="qr-schedule-badge">
          <span>📅 Días:</span> Martes y Miércoles (8:00 AM - 8:00 PM) • Hasta el 31 de Octubre
        </div>
      </div>

      <div className="qr-area">
        <div className="qr-orbit orbit-one" />
        <div className="qr-orbit orbit-two" />
        <div className="qr-card">
          <div className="qr-corners">
            {qr ? <img src={qr} alt="Código QR para jugar Gira y gana" /> : <div className="qr-loading" />}
            <div className="qr-logo">
              <img src="/img/images.png" alt="WiWU" />
            </div>
          </div>
          <strong>
            {scheduleCheck.status === 'EVENT_ENDED'
              ? 'EVENTO FINALIZADO'
              : 'ESCANEA PARA JUGAR'}
          </strong>
        </div>
        <button className="preview-link" onClick={onPreview}>Vista previa móvil <span>→</span></button>
      </div>
    </main>
  )
}

function PlayScreen({ onPlay }: { onPlay: () => void }) {
  return (
    <main className="mobile-screen play-screen">
      <div className="cobweb-container" aria-hidden="true">
        <Cobweb className="cobweb-tr" />
        <Cobweb className="cobweb-bl" />
        <Cobweb className="cobweb-br" />
        <WebSpider />
      </div>
      <div className="moon" />
      <div className="stars" />
      <section className="play-content">
        <div className="pumpkin-stage">
          <div className="pumpkin-glow" />
          <img
            src="/img/2.png"
            alt="Personaje Calabaza Halloween"
            className="hero-pumpkin"
            draggable={false}
          />
        </div>
        <span className="mini-label">UNA SORPRESA TE ESPERA</span>
        <h1>¿Te atreves<br />a <em>jugar?</em></h1>
        <p>Gira la ruleta y deja que el destino<br />elija tu premio... o tu susto.</p>
        <button className="primary-button" onClick={onPlay}>
          <span>JUGAR AHORA</span>
        </button>
        <small className="legal">Al jugar aceptas vivir una experiencia espeluznante.</small>
      </section>
    </main>
  )
}

function WheelScreen({
  rotation,
  spinning,
  spinError,
  onSpin,
}: {
  rotation: number
  spinning: boolean
  spinError: string | null
  onSpin: () => void
}) {
  return (
    <main className="mobile-screen wheel-screen">
      <div className="cobweb-container" aria-hidden="true">
        <Cobweb className="cobweb-tr" />
        <Cobweb className="cobweb-bl" />
        <Cobweb className="cobweb-br" />
        <WebSpider />
      </div>
      <div className="wheel-heading">
        <span className="mini-label">ES TU MOMENTO</span>
        <h1>Gira la <em>ruleta</em></h1>
        <p>¿Qué te tocará esta vez?</p>
      </div>
      <div className={`wheel-wrap ${spinning ? 'is-spinning' : ''}`}>
        <div className="wheel-pointer"><span /></div>
        <div
          className="wheel"
          style={{ background: wheelGradient, transform: `rotate(${rotation}deg)` }}
        >
          {prizes.map((prize, index) => (
            <span
              className={`wheel-label wheel-label-${index} ${prize.color === '#f4f7ff' ? 'dark' : ''}`}
              style={{
                transform: `rotate(${index * 60}deg) translateY(-38.6cqw) rotate(-${index * 60}deg)`,
              }}
              key={`${prize.label}-${index}`}
            >
              {prize.shortLabel}
            </span>
          ))}
          <div className="wheel-center">
            <img src="/img/1.png" alt="Centro de ruleta" draggable={false} />
          </div>
        </div>
        <div className="wheel-shadow" />
      </div>
      <button className="spin-button" onClick={onSpin} disabled={spinning}>
        {spinning ? 'GIRANDO...' : '¡GIRAR!'}
      </button>
      <p className="spin-hint"><span>↻</span> Pulsa el botón y prueba tu suerte</p>
      {spinError && <p className="spin-error" role="alert">{spinError}</p>}
    </main>
  )
}

function BiteJaws() {
  return (
    <div className="bite-jaws" aria-hidden="true">
      <div className="bite-blood">
        <svg viewBox="0 0 400 800" preserveAspectRatio="none">
          <defs>
            <linearGradient id="blood-wet" x1="0" y1="0" x2="0" y2="1">
              <stop stopColor="#8f1028" />
              <stop offset=".45" stopColor="#69091e" />
              <stop offset="1" stopColor="#310611" stopOpacity=".2" />
            </linearGradient>
          </defs>
          <path className="blood-stream blood-stream--left" d="M0 82c13 3 19 15 31 13 14-2 19-15 33-12 11 2 15 12 27 11l8 9c-11 11-16 25-17 42l-2 58c0 14-11 17-15 4l-5-69c-2-13-12-13-16 0l-8 105c-1 15-14 16-17 2l-1-91c-1-13-10-16-15-6L0 176ZM400 82c-13 3-19 15-31 13-14-2-19-15-33-12-11 2-15 12-27 11l-8 9c11 11 16 25 17 42l2 58c0 14 11 17 15 4l5-69c2-13 12-13 16 0l8 105c1 15 14 16 17 2l1-91c1-13 10-16 15-6Z" />
          <path className="blood-splatter" d="M42 116c9-10 18-7 20 0-5 6-13 8-20 0Zm61 34c7-7 13-5 14 1-4 5-10 5-14-1Zm-78 68c6-6 12-4 13 1-3 4-9 5-13-1Zm294-96c7-8 15-6 17 0-4 5-11 7-17 0Zm-31 59c6-7 12-5 13 0-3 5-9 6-13 0Zm72 31c6-7 14-5 15 1-4 5-10 5-15-1ZM22 99c2-8 8-10 12-4-1 6-6 9-12 4Zm351 3c2-8 8-10 12-4-1 6-6 9-12 4Z" />
        </svg>
      </div>
      <svg className="bite-jaw bite-jaw--upper" viewBox="0 0 400 290" preserveAspectRatio="none">
        <defs>
          <linearGradient id="jaw-flesh" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#10070b" />
            <stop offset=".7" stopColor="#260810" />
            <stop offset="1" stopColor="#080407" />
          </linearGradient>
          <linearGradient id="fang-ivory" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#fff8e8" />
            <stop offset=".6" stopColor="#c8b8a4" />
            <stop offset="1" stopColor="#62545a" />
          </linearGradient>
        </defs>
        <path fill="url(#jaw-flesh)" d="M0 0h400v70c-18 13-34 13-50 1-18 23-37 25-57 5-20 24-39 25-59 5-21 24-41 25-61 4-20 22-39 22-59 1C94 107 74 106 54 84 36 105 18 103 0 89Z" />
        <path d="M0 89C18 103 36 105 54 84 74 106 94 107 114 86c20 21 39 21 59-1 20 21 40 20 61-4 20 20 39 19 59-5 20 20 39 18 57-5 16 12 32 12 50-1" fill="none" stroke="#731426" strokeWidth="9" opacity=".82" />
        <path fill="url(#fang-ivory)" d="M30 84q17 7 34-3l-8 112q-5 34-13 0Zm64 17q17 4 34-5l-8 145q-5 37-12 0Zm68-14q17 8 34-1l-8 111q-5 33-12 0Zm68 7q17 5 34-2l-8 139q-5 35-12 0Zm67-14q17 9 34-2l-8 105q-5 30-12 0Zm65-1q17 7 34-2l-8 89q-5 27-12 0Z" />
        <path fill="#fff9e9" opacity=".36" d="m59 93-10 99-2-1 2-101Zm64 13-10 127-2-1 2-129Zm68-11-10 97-2-1 2-99Zm68 10-10 124-2-1 2-126Z" />
      </svg>
      <svg className="bite-jaw bite-jaw--lower" viewBox="0 0 400 290" preserveAspectRatio="none">
        <defs>
          <linearGradient id="jaw-flesh-lower" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#10070b" />
            <stop offset=".7" stopColor="#260810" />
            <stop offset="1" stopColor="#080407" />
          </linearGradient>
          <linearGradient id="fang-ivory-lower" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#fff8e8" />
            <stop offset=".6" stopColor="#c8b8a4" />
            <stop offset="1" stopColor="#62545a" />
          </linearGradient>
        </defs>
        <g transform="translate(0 290) scale(1 -1)">
          <path fill="url(#jaw-flesh-lower)" d="M0 0h400v70c-18 13-34 13-50 1-18 23-37 25-57 5-20 24-39 25-59 5-21 24-41 25-61 4-20 22-39 22-59 1C94 107 74 106 54 84 36 105 18 103 0 89Z" />
          <path d="M0 89C18 103 36 105 54 84 74 106 94 107 114 86c20 21 39 21 59-1 20 21 40 20 61-4 20 20 39 19 59-5 20 20 39 18 57-5 16 12 32 12 50-1" fill="none" stroke="#731426" strokeWidth="9" opacity=".82" />
          <path fill="url(#fang-ivory-lower)" d="M30 84q17 7 34-3l-8 112q-5 34-13 0Zm64 17q17 4 34-5l-8 145q-5 37-12 0Zm68-14q17 8 34-1l-8 111q-5 33-12 0Zm68 7q17 5 34-2l-8 139q-5 35-12 0Zm67-14q17 9 34-2l-8 105q-5 30-12 0Zm65-1q17 7 34-2l-8 89q-5 27-12 0Z" />
          <path fill="#fff9e9" opacity=".36" d="m59 93-10 99-2-1 2-101Zm64 13-10 127-2-1 2-129Zm68-11-10 97-2-1 2-99Zm68 10-10 124-2-1 2-126Z" />
        </g>
      </svg>
    </div>
  )
}

function ResultVisual({ kind }: { kind: PrizeKind }) {
  if (kind === 'scare') {
    return null
  }
  if (kind === 'charge') {
    return (
      <div className="bolt-wrap" aria-hidden="true">
        <div className="energy-ring ring-a" />
        <div className="energy-ring ring-b" />
        <svg viewBox="0 0 100 130">
          <path d="M57 4 18 70h27l-5 56 43-73H55Z" />
        </svg>
      </div>
    )
  }
  if (kind === 'trick') {
    return (
      <div className="mummy-bandage-stage">
        <div className="mummy-energy-glow" />
        <img
          src="/img/3.png"
          alt="Momia WiWU"
          className="mummy-hero-img"
          draggable={false}
        />
      </div>
    )
  }
  return (
    <div className="ghost-orbit">
      <img
        src="/img/fantasma.png"
        alt="Fantasma WiWU"
        className="ghost-image"
        draggable={false}
      />
      <div className="ghost-trail trail-one" />
      <div className="ghost-trail trail-two" />
    </div>
  )
}

const resultCopy: Record<PrizeKind, { overline: string; title: string; description: string }> = {
  scare: {
    overline: 'EL DESTINO HA HABLADO',
    title: '¡SUSTO!',
    description: '',
  },
  charge: {
    overline: '¡PREMIO DESBLOQUEADO!',
    title: '¡ESTIRA LA CARGA!',
    description: '¡Ganaste un Power Bank!',
  },
  trick: {
    overline: '¡PREMIO DESBLOQUEADO!',
    title: '¡GANASTE UN CABLE!',
    description: '¡Estira la carga con tu nuevo cable!',
  },
  again_spin: {
    overline: '¡TIENES OTRA OPORTUNIDAD!',
    title: 'GIRA OTRA VEZ',
    description: '¡Te vamos a dar otra oportunidad! Los fantasmas te otorgan un giro extra en este momento.',
  },
}

function ResultScreen({
  prize,
  spinsRemaining,
  scareMessage,
  onAgain,
  onFinish,
}: {
  prize: Prize
  spinsRemaining: number
  scareMessage: string
  onAgain: () => void
  onFinish: () => void
}) {
  const copy = resultCopy[prize.kind]
  const isExtraSpin = prize.kind === 'again_spin'
  const description =
    prize.kind === 'scare' ? scareMessage : copy.description

  return (
    <main className={`mobile-screen result-screen result-${prize.kind === 'again_spin' ? 'again' : prize.kind}`}>
      {prize.kind === 'scare' && <BiteJaws />}
      <div className="result-rays" />
      <section className="result-content">
        <ResultVisual kind={prize.kind} />
        <span className="mini-label">{copy.overline}</span>
        <h1>{copy.title}</h1>
        <p>{description}</p>

        {isExtraSpin ? (
          <div>
            <button className="result-button" onClick={onAgain}>
              <span>¡GIRAR DE NUEVO!</span>
              <b>↻</b>
            </button>
            <small className="legal" style={{ display: 'block', marginTop: '14px' }}>
              ✨ ¡Giro extra concedido! Se suma a las oportunidades que te quedan hoy.
            </small>
          </div>
        ) : (
          <div>
            {spinsRemaining > 0 ? (
              <>
                <button className="result-button" onClick={onAgain}>
                  <span>USAR MI OTRO GIRO</span>
                  <b>↻</b>
                </button>
                <small className="legal" style={{ display: 'block', marginTop: '14px' }}>
                  Te quedan {spinsRemaining} {spinsRemaining === 1 ? 'oportunidad' : 'oportunidades'} hoy.
                </small>
              </>
            ) : (
              <>
                <button className="result-button" onClick={onFinish}>
                  <span>FINALIZAR TURNO</span>
                  <b>✓</b>
                </button>
                <small className="legal" style={{ display: 'block', marginTop: '14px' }}>
                  Ya usaste tus oportunidades de hoy. Vuelve el próximo martes o miércoles de 8:00 AM a 8:00 PM.
                </small>
              </>
            )}
          </div>
        )}
      </section>
    </main>
  )
}

export default function App() {
  const initialScreen: Screen = 'play'
  const [screen, setScreen] = useState<Screen>(initialScreen)
  const [muted, setMuted] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [spinError, setSpinError] = useState<string | null>(null)
  const [result, setResult] = useState<Prize>(prizes[0])
  const [scareMessage, setScareMessage] = useState('Esta vez no hubo suerte. Mejor intenta otro día.')
  const spinTimer = useRef<number | null>(null)
  const spinInProgress = useRef(false)
  const stopWheelSound = useRef<(() => void) | null>(null)
  const sharedRaffleRequestId = useRef<string | null>(null)

  // Control de simulación de fecha / horario para desarrollo y verificación
  const [simPreset, setSimPreset] = useState<SimulationPreset>('REAL')
  const [simDate, setSimDate] = useState<Date | null>(null)
  const [simPlayed, setSimPlayed] = useState<boolean>(false)
  const [dailyPlayState, setDailyPlayState] = useState<DailyPlayState>(() =>
    getDailyPlayState()
  )

  // Estado del horario actual
  const effectiveDate = simDate || new Date()
  const [scheduleCheck, setScheduleCheck] = useState<GameScheduleCheck>(() =>
    checkGameSchedule(effectiveDate)
  )

  const refreshSchedule = (date: Date = simDate || new Date()) => {
    setScheduleCheck(checkGameSchedule(date))
    setDailyPlayState(getDailyPlayState(date))
  }

  // Verificación periódica en tiempo real (cada 30 segundos) si está en modo REAL
  useEffect(() => {
    if (simPreset !== 'REAL') return
    const interval = window.setInterval(() => {
      refreshSchedule(new Date())
    }, 30000)
    return () => window.clearInterval(interval)
  }, [simPreset])

  useEffect(() => () => {
    if (spinTimer.current) window.clearTimeout(spinTimer.current)
    stopWheelSound.current?.()
    spinInProgress.current = false
  }, [])

  // Control de forzado de premio para pruebas en desarrollo
  const [forcedPrizeKind, setForcedPrizeKind] = useState<PrizeKind | 'random'>('random')

  function goTo(next: Screen) {
    setScreen(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function spin() {
    if (spinning || spinInProgress.current) return

    const playDate = simDate || new Date()
    const currentPlayState = getDailyPlayState(playDate)
    if (currentPlayState.completed || currentPlayState.spinsRemaining <= 0) {
      refreshSchedule(playDate)
      return
    }

    spinInProgress.current = true
    setSpinning(true)
    setSpinError(null)

    const allowAgain = !currentPlayState.bonusSpinGranted

    let raffle: RaffleResult
    try {
      if (import.meta.env.DEV) {
        raffle = drawPrize(forcedPrizeKind, allowAgain)
      } else {
        sharedRaffleRequestId.current ??= crypto.randomUUID()
        raffle = await drawPrizeFromSharedBackend(
          allowAgain,
          sharedRaffleRequestId.current
        )
        sharedRaffleRequestId.current = null
      }
    } catch (error) {
      console.error('No se pudo obtener el resultado del sorteo.', error)
      setSpinning(false)
      spinInProgress.current = false
      setSpinError('No pudimos conectar con el sorteo. Tu giro no se consumió; inténtalo de nuevo.')
      return
    }

    const consumedState = consumeDailySpin(playDate)
    if (!consumedState) {
      setSpinning(false)
      spinInProgress.current = false
      refreshSchedule(playDate)
      return
    }
    setDailyPlayState(consumedState)

    const nextRotation = calculateNextRotation(rotation, raffle.prizeIndex, raffle.jitterAngle, 6)
    setRotation(nextRotation)
    if (!muted) stopWheelSound.current = playWheelSound()

    spinTimer.current = window.setTimeout(() => {
      stopWheelSound.current?.()
      stopWheelSound.current = null
      const selected = raffle.prize
      setResult(selected)
      if (selected.kind === 'scare') {
        setScareMessage(
          Math.random() < 0.5
            ? 'Esta vez no hubo suerte.'
            : 'Mejor intenta otro día.'
        )
      }
      setSpinning(false)
      spinInProgress.current = false
      goTo('result')
      if (!muted) playResultSound(selected.soundVariant)

      if (selected.kind === 'charge') {
        recordPlayedToday(playDate, selected.label)
        setDailyPlayState(getDailyPlayState(playDate))
      } else if (selected.kind === 'again_spin' && allowAgain) {
        recordLastPlayedInfo(playDate, selected.label)
        setDailyPlayState(grantDailyBonusSpin(playDate))
      } else {
        recordLastPlayedInfo(playDate, selected.label)
        setDailyPlayState(getDailyPlayState(playDate))
      }
      refreshSchedule(playDate)
    }, 4300)
  }

  const handleSelectPreset = (preset: SimulationPreset, customDate: Date | null) => {
    setSimPreset(preset)
    setSimDate(customDate)
    const date = customDate || new Date()
    setScheduleCheck(checkGameSchedule(date))
    setDailyPlayState(getDailyPlayState(date))
  }

  return (
    <div className="app-shell">
      <Header muted={muted} onToggleSound={() => setMuted((value) => !value)} />

      {/*
      Pantalla QR (Totem / Pantalla de bienvenida), disponible para reactivarla:
      {screen === 'qr' && (
        <QrScreen
          onPreview={() => goTo('play')}
          scheduleCheck={scheduleCheck}
        />
      )}
      */}

      {/* Pantalla Play (Inicio móvil al escanear) */}
      {screen === 'play' && (
        scheduleCheck.canPlay ? (
          <PlayScreen onPlay={() => goTo('wheel')} />
        ) : (
          <ScheduleStatusScreen
            check={scheduleCheck}
            onRefresh={() => refreshSchedule()}
          />
        )
      )}

      {/* Pantalla Ruleta */}
      {screen === 'wheel' && (
        scheduleCheck.canPlay ? (
          <WheelScreen
            rotation={rotation}
            spinning={spinning}
            spinError={spinError}
            onSpin={spin}
          />
        ) : (
          <ScheduleStatusScreen
            check={scheduleCheck}
            onRefresh={() => refreshSchedule()}
          />
        )
      )}

      {/* Pantalla Resultado */}
      {screen === 'result' && (
        <ResultScreen
          prize={result}
          spinsRemaining={dailyPlayState.spinsRemaining}
          scareMessage={scareMessage}
          onAgain={() => goTo('wheel')}
          onFinish={() => {
            refreshSchedule()
            goTo('play')
          }}
        />
      )}

      {/* Simulador de Horarios y Algoritmo de Premios para pruebas */}
      {import.meta.env.DEV && (
        <ScheduleDevSimulator
          currentPreset={simPreset}
          onSelectPreset={handleSelectPreset}
          onRefreshSchedule={() => refreshSchedule()}
          isSimulatedPlayed={simPlayed}
          onToggleSimulatedPlayed={setSimPlayed}
          forcedPrizeKind={forcedPrizeKind}
          onSelectForcedPrizeKind={setForcedPrizeKind}
          reSpinsInCurrentSession={dailyPlayState.bonusSpinGranted ? 1 : 0}
        />
      )}
    </div>
  )
}
