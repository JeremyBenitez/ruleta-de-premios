import React from 'react'
import {
  GameScheduleCheck,
  getLastPlayedInfo,
} from '../utils/gameSchedule'

interface ScheduleStatusScreenProps {
  check: GameScheduleCheck
  onRefresh: () => void
}

const DAYS_SHORT = [
  { key: 1, label: 'Lu', active: false },
  { key: 2, label: 'Ma', active: true },
  { key: 3, label: 'Mi', active: true },
  { key: 4, label: 'Ju', active: false },
  { key: 5, label: 'Vi', active: false },
  { key: 6, label: 'Sá', active: false },
  { key: 0, label: 'Do', active: false },
]

export function ScheduleStatusScreen({
  check,
  onRefresh,
}: ScheduleStatusScreenProps) {
  const lastInfo = check.status === 'ALREADY_PLAYED' ? getLastPlayedInfo() : null
  const currentDayOfWeek = new Date().getDay()

  // Selección de imagen y brillo según el tipo de pantalla
  let imageSrc = '/img/4.png' // Caldero de bruja por defecto
  let imageAlt = 'Caldero misterioso WiWU'
  let glowClass = 'cauldron-glow'
  let badgeClass = 'badge-orange'

  if (check.status === 'EVENT_ENDED') {
    imageSrc = '/img/4.png'
    imageAlt = 'Fin del evento'
    glowClass = 'cauldron-glow glow-red'
    badgeClass = 'badge-red'
  } else if (check.status === 'ALREADY_PLAYED') {
    imageSrc = '/img/3.png' // Momia traviesa
    imageAlt = 'Momia traviesa WiWU'
    glowClass = 'cauldron-glow glow-purple'
    badgeClass = 'badge-purple'
  } else if (check.status === 'CLOSED_HOURS') {
    imageSrc = '/img/2.png' // Calabaza
    imageAlt = 'Calabaza en descanso'
    glowClass = 'cauldron-glow glow-orange'
    badgeClass = 'badge-orange'
  }

  return (
    <main className="mobile-screen status-screen">
      <div className="status-content">
        {/* Personaje / Escenario visual */}
        <div className="status-visual-stage">
          <div className={glowClass} />
          <img
            src={imageSrc}
            alt={imageAlt}
            className="status-cauldron"
            draggable={false}
          />
        </div>

        {/* Badge de estado */}
        <div className={`status-badge ${badgeClass}`}>
          <span className="status-badge-dot" />
          <span>{check.badge}</span>
        </div>

        {/* Título principal */}
        <h1>{check.title}</h1>

        {/* Subtítulo descriptivo */}
        <p>{check.subtitle}</p>

        {/* Banner de último premio si ya jugó hoy */}
        {check.status === 'ALREADY_PLAYED' && lastInfo?.prize && (
          <div className="last-prize-banner">
            <div className="last-prize-info">
              <span>Tu resultado de hoy</span>
              <strong>{lastInfo.prize}</strong>
            </div>
            {lastInfo.time && <div className="last-prize-time">Hora: {lastInfo.time}</div>}
          </div>
        )}

        {/* Tarjeta de horarios y reglas */}
        <div className="schedule-card">
          <div className="schedule-days-grid">
            {DAYS_SHORT.map((item) => {
              const isToday = item.key === currentDayOfWeek
              return (
                <div
                  key={item.label}
                  className={`day-chip ${item.active ? 'active-day' : ''} ${
                    isToday ? 'today-highlight' : ''
                  }`}
                >
                  <span className="day-name">{item.label}</span>
                  <span className="day-status">
                    {item.active ? 'ABRE' : 'CERRADO'}
                  </span>
                </div>
              )
            })}
          </div>

          <div className="schedule-rule-list">
            <div className="schedule-rule-item">
              <span className="schedule-rule-icon">🗓️</span>
              <div>
                Días de juego: <b>Solo Martes y Miércoles</b>
              </div>
            </div>
            <div className="schedule-rule-item">
              <span className="schedule-rule-icon">⏰</span>
              <div>
                Horario: <b>8:00 AM a 8:00 PM</b>
              </div>
            </div>
            <div className="schedule-rule-item">
              <span className="schedule-rule-icon">📱</span>
              <div>
                Límite: <b>1 giro al día por dispositivo; puede ganar uno extra</b>
              </div>
            </div>
            <div className="schedule-rule-item">
              <span className="schedule-rule-icon">🎃</span>
              <div>
                Vigencia: <b>Hasta el 31 de Octubre</b>
              </div>
            </div>
          </div>
        </div>

        {/* Botón de acción */}
        <button className="primary-button" onClick={onRefresh}>
          <span>VERIFICAR HORARIO</span>
          <b>↻</b>
        </button>

      </div>
    </main>
  )
}
