import React, { useState } from 'react'
import {
  recordPlayedToday,
  resetPlayedToday,
  EVENT_YEAR,
} from '../utils/gameSchedule'
import { simulateRaffleDraws } from '../utils/prizeRaffle'
import { PrizeKind } from '../App'

const SIMULATION_PARTICIPANTS = 1000

export type SimulationPreset =
  | 'REAL'
  | 'TUESDAY_OPEN'
  | 'WEDNESDAY_OPEN'
  | 'THURSDAY_CLOSED'
  | 'TUESDAY_EARLY'
  | 'TUESDAY_LATE'
  | 'SUNDAY_CLOSED'
  | 'EVENT_ENDED'

interface ScheduleDevSimulatorProps {
  currentPreset: SimulationPreset
  onSelectPreset: (preset: SimulationPreset, customDate: Date | null) => void
  onRefreshSchedule: () => void
  isSimulatedPlayed: boolean
  onToggleSimulatedPlayed: (played: boolean) => void
  forcedPrizeKind?: PrizeKind | 'random'
  onSelectForcedPrizeKind?: (kind: PrizeKind | 'random') => void
  reSpinsInCurrentSession?: number
}

export function getSimulatedDateForPreset(preset: SimulationPreset): Date | null {
  const now = new Date()
  const year = EVENT_YEAR || now.getFullYear()

  switch (preset) {
    case 'TUESDAY_OPEN':
      return new Date(year, 9, 20, 11, 30, 0)
    case 'WEDNESDAY_OPEN':
      return new Date(year, 9, 21, 16, 15, 0)
    case 'THURSDAY_CLOSED':
      return new Date(year, 9, 22, 15, 0, 0)
    case 'TUESDAY_EARLY':
      return new Date(year, 9, 20, 6, 45, 0)
    case 'TUESDAY_LATE':
      return new Date(year, 9, 20, 21, 15, 0)
    case 'SUNDAY_CLOSED':
      return new Date(year, 9, 25, 12, 0, 0)
    case 'EVENT_ENDED':
      return new Date(year, 10, 1, 10, 0, 0)
    case 'REAL':
    default:
      return null
  }
}

export function ScheduleDevSimulator({
  currentPreset,
  onSelectPreset,
  onRefreshSchedule,
  isSimulatedPlayed,
  onToggleSimulatedPlayed,
  forcedPrizeKind = 'random',
  onSelectForcedPrizeKind,
  reSpinsInCurrentSession = 0,
}: ScheduleDevSimulatorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'raffle' | 'schedule'>('raffle')
  const [simResults, setSimResults] = useState<{
    distribution: Record<PrizeKind, number>
    totalSpins: number
    bonusSpins: number
    participantsWithPrize: number
  } | null>(null)

  const handlePresetChange = (preset: SimulationPreset) => {
    const simDate = getSimulatedDateForPreset(preset)
    onSelectPreset(preset, simDate)
  }

  const handleResetDevice = () => {
    resetPlayedToday()
    onToggleSimulatedPlayed(false)
    onRefreshSchedule()
  }

  const handleForcePlayToday = () => {
    recordPlayedToday(getSimulatedDateForPreset(currentPreset) || new Date(), '¿CÁRGALO?')
    onToggleSimulatedPlayed(true)
    onRefreshSchedule()
  }

  const handleRunSimulation = () => {
    const results = simulateRaffleDraws(SIMULATION_PARTICIPANTS)
    setSimResults(results)
  }

  return (
    <div className="dev-sim-container">
      <button
        className="dev-sim-toggle"
        onClick={() => setIsOpen((prev) => !prev)}
        title="Simulador de Horario y Algoritmo de Premios"
      >
        <span>🎲</span>
        <span>Simulador</span>
      </button>

      {isOpen && (
        <div className="dev-sim-panel" style={{ width: '350px' }}>
          <div className="dev-sim-header">
            <strong>⚙️ Control de Premios & Horarios</strong>
            <button className="dev-sim-close" onClick={() => setIsOpen(false)}>
              ✕
            </button>
          </div>

          {/* Pestañas Horario / Algoritmo */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
            <button
              onClick={() => setActiveTab('raffle')}
              style={{
                flex: 1,
                padding: '6px',
                fontSize: '11px',
                fontWeight: 700,
                borderRadius: '8px',
                border: '1px solid',
                borderColor: activeTab === 'raffle' ? '#ff7a1a' : 'rgba(255,255,255,0.1)',
                background: activeTab === 'raffle' ? 'rgba(255,122,26,0.2)' : 'transparent',
                color: activeTab === 'raffle' ? '#ffaa6c' : '#7282a5',
                cursor: 'pointer',
              }}
            >
              🎲 Premiación & Sonidos
            </button>
            <button
              onClick={() => setActiveTab('schedule')}
              style={{
                flex: 1,
                padding: '6px',
                fontSize: '11px',
                fontWeight: 700,
                borderRadius: '8px',
                border: '1px solid',
                borderColor: activeTab === 'schedule' ? '#8b3dff' : 'rgba(255,255,255,0.1)',
                background: activeTab === 'schedule' ? 'rgba(139,61,255,0.2)' : 'transparent',
                color: activeTab === 'schedule' ? '#cbb2ff' : '#7282a5',
                cursor: 'pointer',
              }}
            >
              🕒 Fechas & Horas
            </button>
          </div>

          {activeTab === 'raffle' && (
            <div>
              <div style={{ marginBottom: '12px', padding: '10px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', color: '#aebddd', fontSize: '11px', lineHeight: 1.5 }}>
                Giro normal: 30% de premio, 10% de giro extra y 60% de susto. El giro extra da 10% de premio. Probabilidad base de premio por participante: 31%, antes del control de rachas compartido. Los colores/sectores no representan estas probabilidades. La tienda lleva manualmente el conteo diario.
              </div>

              {/* Estado de giro actual */}
              <div style={{ background: 'rgba(255,255,255,0.04)', padding: '8px 10px', borderRadius: '10px', marginBottom: '12px', fontSize: '11px' }}>
                <span style={{ color: '#9bb9ff', display: 'block', fontSize: '10px' }}>EXCEPCIÓN "GIRA OTRA VEZ"</span>
                <div>Re-giros en sesión activa: <b>{reSpinsInCurrentSession > 0 ? `✨ ${reSpinsInCurrentSession} (Giro extra activo)` : '0 (Tirada inicial)'}</b></div>
                <small style={{ color: '#7282a5' }}>Hay 1 giro diario por dispositivo. Si sale, se añade 1 extra; no puede repetirse.</small>
              </div>

              {/* Forzar próximo tiro */}
              <div className="dev-sim-group">
                <label>Forzar próximo tiro (Para probar sonidos & pantallas)</label>
                <select
                  className="dev-sim-select"
                  value={forcedPrizeKind}
                  onChange={(e) => onSelectForcedPrizeKind?.(e.target.value as PrizeKind | 'random')}
                >
                  <option value="random">🎲 Sorteo ponderado (probabilidades controladas)</option>
                  <option value="charge">🎁 Forzar: CÁRGALO (Power Bank)</option>
                  <option value="trick">🧻 Forzar: TRUCO (Cable)</option>
                  <option value="again_spin">🔄 Forzar: GIRA OTRA VEZ (Te vamos a dar otra oportunidad)</option>
                  <option value="scare">👻 Forzar: ¡SUSTO! (Sonido Jumpscare)</option>
                </select>
              </div>

              {/* Prueba de 100 giros */}
              <div style={{ marginTop: '10px' }}>
                <button
                  className="dev-sim-btn"
                  style={{ width: '100%', padding: '7px' }}
                  onClick={handleRunSimulation}
                >
                  🧪 Simular {SIMULATION_PARTICIPANTS} Participantes
                </button>

                {simResults && (
                  <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(0,0,0,0.4)', borderRadius: '8px', fontSize: '11px' }}>
                    <div style={{ color: '#ffaa6c', fontWeight: 700, marginBottom: '4px' }}>
                      {SIMULATION_PARTICIPANTS} participantes · {simResults.totalSpins} giros · {simResults.bonusSpins} extras
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                      <span>
                        🏆 Premios: {simResults.participantsWithPrize} (
                        {((simResults.participantsWithPrize / SIMULATION_PARTICIPANTS) * 100).toFixed(1)}%)
                      </span>
                      <span>🎁 Power Bank: {simResults.distribution.charge}</span>
                      <span>🧻 Cable: {simResults.distribution.trick}</span>
                      <span>👻 Susto: {simResults.distribution.scare}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'schedule' && (
            <div>
              <div className="dev-sim-group">
                <label>Escenario de prueba</label>
                <select
                  className="dev-sim-select"
                  value={currentPreset}
                  onChange={(e) => handlePresetChange(e.target.value as SimulationPreset)}
                >
                  <option value="REAL">🕒 Tiempo Real (Sistema)</option>
                  <option value="TUESDAY_OPEN">🟢 Martes 11:30 AM (Ruleta Abierta)</option>
                  <option value="WEDNESDAY_OPEN">🟢 Miércoles 4:15 PM (Ruleta Abierta)</option>
                  <option value="THURSDAY_CLOSED">⛔ Jueves 3:00 PM (Día Cerrado)</option>
                  <option value="SUNDAY_CLOSED">⛔ Domingo 12:00 PM (Día Cerrado)</option>
                  <option value="TUESDAY_EARLY">🌙 Martes 6:45 AM (Antes de 8 AM)</option>
                  <option value="TUESDAY_LATE">🌙 Martes 9:15 PM (Después de 8 PM)</option>
                  <option value="EVENT_ENDED">🎃 1 de Noviembre (Evento Finalizado)</option>
                </select>
              </div>

              <div className="dev-sim-group">
                <label>Control de Tiradas Diarias (1 por dispositivo)</label>
                <div className="dev-sim-actions">
                  <button
                    className="dev-sim-btn danger"
                    onClick={handleForcePlayToday}
                    title="Marca este dispositivo como que ya jugó hoy"
                  >
                    Simular "Ya Jugó"
                  </button>
                  <button
                    className="dev-sim-btn"
                    onClick={handleResetDevice}
                    title="Limpia localStorage para volver a jugar"
                  >
                    🔄 Reset Tirada
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
