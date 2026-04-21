import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { formatDuration, parseTimers } from '../utils/parseTimers'

const TimerContext = createContext(null)

function playCompletion(audioRef) {
  const audio = audioRef.current
  if (audio) {
    audio.currentTime = 0
    audio.play().catch(() => {})
    return
  }

  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 880
    osc.connect(gain)
    gain.connect(ctx.destination)
    gain.gain.setValueAtTime(0.2, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.2)
  } catch {
    // Follow-up: background-tab notifications are out of scope for this change.
  }
}

export function TimerProvider({ children }) {
  const [timers, setTimers] = useState([])
  const audioRef = useRef(null)

  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now()
      setTimers((current) => current.map((timer) => {
        if (timer.dismissed) return timer
        if (timer.pausedAt) return timer
        const remaining = Math.max(0, timer.seconds - Math.floor((now - timer.startedAt) / 1000))
        if (remaining === 0 && !timer.completedAt) {
          playCompletion(audioRef)
          if (navigator.vibrate) navigator.vibrate([300, 150, 300, 150, 300])
          return { ...timer, completedAt: now }
        }
        return timer
      }))
    }, 250)
    return () => clearInterval(id)
  }, [])

  const startTimer = useCallback((seconds, label) => {
    setTimers((current) => {
      const existing = current.find((timer) => timer.label === label && !timer.completedAt && !timer.dismissed)
      if (existing) return current
      return [...current, {
        id: `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        label,
        seconds,
        startedAt: Date.now(),
        pausedAt: null,
        completedAt: null,
        dismissed: false,
      }]
    })
  }, [])

  const pauseTimer = useCallback((id) => {
    setTimers((current) => current.map((timer) => (
      timer.id === id && !timer.pausedAt && !timer.completedAt
        ? { ...timer, pausedAt: Date.now() }
        : timer
    )))
  }, [])

  const resumeTimer = useCallback((id) => {
    setTimers((current) => current.map((timer) => {
      if (timer.id !== id || !timer.pausedAt || timer.completedAt) return timer
      const pausedFor = Date.now() - timer.pausedAt
      return {
        ...timer,
        pausedAt: null,
        startedAt: timer.startedAt + pausedFor,
      }
    }))
  }, [])

  const dismissTimer = useCallback((id) => {
    setTimers((current) => current.filter((timer) => timer.id !== id))
  }, [])

  const value = useMemo(() => ({ timers, startTimer, pauseTimer, resumeTimer, dismissTimer }), [timers, startTimer, pauseTimer, resumeTimer, dismissTimer])

  return (
    <TimerContext.Provider value={value}>
      {children}
      <audio ref={audioRef} preload="auto" />
      <TimerTray />
    </TimerContext.Provider>
  )
}

export function useTimers() {
  const context = useContext(TimerContext)
  if (!context) throw new Error('useTimers must be used within TimerProvider')
  return context
}

function getRemaining(timer) {
  if (timer.completedAt) return 0
  if (timer.pausedAt) {
    return Math.max(0, timer.seconds - Math.floor((timer.pausedAt - timer.startedAt) / 1000))
  }
  return Math.max(0, timer.seconds - Math.floor((Date.now() - timer.startedAt) / 1000))
}

export function TimerChip({ seconds, label }) {
  const { timers, startTimer } = useTimers()
  const activeTimer = timers.find((timer) => timer.label === label && !timer.completedAt)

  if (activeTimer) {
    return <span className="timer-chip timer-chip--active">⏱ {formatDuration(getRemaining(activeTimer))}</span>
  }

  return (
    <button type="button" className="timer-chip" onClick={() => startTimer(seconds, label)}>
      ⏱ {label}
    </button>
  )
}

export function InstructionText({ text }) {
  const segments = parseTimers(text)
  return (
    <>
      {segments.map((segment, index) => {
        if (segment.type === 'timer') {
          return <TimerChip key={`${segment.label}-${index}`} seconds={segment.seconds} label={segment.label} />
        }
        return <span key={`${segment.value}-${index}`}>{segment.value}</span>
      })}
    </>
  )
}

function TimerTray() {
  const { timers, pauseTimer, resumeTimer, dismissTimer } = useTimers()
  const visibleTimers = timers.filter((timer) => !timer.dismissed)

  if (visibleTimers.length === 0) return null

  return (
    <div className="timer-tray">
      {visibleTimers.map((timer) => {
        const remaining = getRemaining(timer)
        const done = remaining === 0
        return (
          <div key={timer.id} className={`timer-tray__item ${done ? 'timer-tray__item--done' : ''}`}>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-text-primary">{timer.label}</div>
              <div className="text-xs text-text-secondary tabular-nums">{done ? 'Done' : formatDuration(remaining)}</div>
            </div>
            {!done && (
              timer.pausedAt ? (
                <button type="button" className="btn-ghost px-3 py-1 text-xs" onClick={() => resumeTimer(timer.id)}>Resume</button>
              ) : (
                <button type="button" className="btn-ghost px-3 py-1 text-xs" onClick={() => pauseTimer(timer.id)}>Pause</button>
              )
            )}
            <button type="button" className="btn-ghost px-3 py-1 text-xs" onClick={() => dismissTimer(timer.id)}>Dismiss</button>
          </div>
        )
      })}
    </div>
  )
}
