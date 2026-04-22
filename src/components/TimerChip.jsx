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

function getRemaining(timer) {
  if (timer.completedAt) return 0
  const endTime = timer.startedAt + timer.seconds * 1000
  const reference = timer.pausedAt ?? Date.now()
  return Math.max(0, Math.ceil((endTime - reference) / 1000))
}

export function TimerProvider({ children }) {
  const [timers, setTimers] = useState([])
  const [, forceTick] = useState(0)
  const audioRef = useRef(null)

  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now()
      setTimers((current) => current.map((timer) => {
        if (timer.completedAt || timer.pausedAt) return timer
        const remaining = Math.max(0, Math.ceil(((timer.startedAt + timer.seconds * 1000) - now) / 1000))
        if (remaining === 0 && !timer.completedAt) {
          playCompletion(audioRef)
          if (navigator.vibrate) navigator.vibrate([300, 150, 300, 150, 300])
          return { ...timer, completedAt: now }
        }
        return timer
      }))
      forceTick((value) => value + 1)
    }, 250)
    return () => clearInterval(id)
  }, [])

  const startTimer = useCallback((seconds, key) => {
    setTimers((current) => {
      const existing = current.find((timer) => timer.key === key)
      if (existing) {
        return current.map((timer) => (
          timer.key === key
            ? {
                ...timer,
                seconds,
                startedAt: Date.now(),
                pausedAt: null,
                completedAt: null,
              }
            : timer
        ))
      }
      return [...current, {
        id: `${key}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        key,
        seconds,
        startedAt: Date.now(),
        pausedAt: null,
        completedAt: null,
      }]
    })
  }, [])

  const pauseTimer = useCallback((key) => {
    setTimers((current) => current.map((timer) => (
      timer.key === key && !timer.pausedAt && !timer.completedAt
        ? { ...timer, pausedAt: Date.now() }
        : timer
    )))
  }, [])

  const resumeTimer = useCallback((key) => {
    setTimers((current) => current.map((timer) => {
      if (timer.key !== key || !timer.pausedAt || timer.completedAt) return timer
      const pausedFor = Date.now() - timer.pausedAt
      return {
        ...timer,
        pausedAt: null,
        startedAt: timer.startedAt + pausedFor,
      }
    }))
  }, [])

  const dismissTimer = useCallback((key) => {
    setTimers((current) => current.filter((timer) => timer.key !== key))
  }, [])

  const value = useMemo(() => ({ timers, startTimer, pauseTimer, resumeTimer, dismissTimer }), [timers, startTimer, pauseTimer, resumeTimer, dismissTimer])

  return (
    <TimerContext.Provider value={value}>
      {children}
      <audio ref={audioRef} preload="auto" />
    </TimerContext.Provider>
  )
}

export function useTimers() {
  const context = useContext(TimerContext)
  if (!context) throw new Error('useTimers must be used within TimerProvider')
  return context
}

export function TimerChip({ seconds, label, timerKey }) {
  const { timers, startTimer, pauseTimer, resumeTimer, dismissTimer } = useTimers()
  const timer = timers.find((entry) => entry.key === timerKey)

  if (!timer) {
    return (
      <button type="button" className="timer-chip" onClick={() => startTimer(seconds, timerKey)}>
        ⏱ {label}
      </button>
    )
  }

  const done = Boolean(timer.completedAt)
  const paused = Boolean(timer.pausedAt)
  const remaining = getRemaining(timer)

  if (done) {
    return (
      <button type="button" className="timer-chip timer-chip--done" onClick={() => dismissTimer(timerKey)}>
        ✓ Done
      </button>
    )
  }

  return (
    <span className={`timer-chip timer-chip--active ${paused ? 'timer-chip--paused' : ''}`}>
      <button
        type="button"
        className="timer-chip__main"
        onClick={() => (paused ? resumeTimer(timerKey) : pauseTimer(timerKey))}
      >
        ⏱ <span className="tabular-nums">{formatDuration(remaining)}</span>
      </button>
      <button
        type="button"
        className="timer-chip__dismiss"
        onClick={() => dismissTimer(timerKey)}
        aria-label="Reset timer"
      >
        ✕
      </button>
    </span>
  )
}

export function InstructionText({ text, contextKey = 'instruction' }) {
  const segments = parseTimers(text)
  let timerIndex = 0

  return (
    <>
      {segments.map((segment, index) => {
        if (segment.type === 'timer') {
          const currentKey = `${contextKey}-${timerIndex}`
          timerIndex += 1
          return <TimerChip key={`${segment.label}-${index}`} seconds={segment.seconds} label={segment.label} timerKey={currentKey} />
        }
        return <span key={`${segment.value}-${index}`}>{segment.value}</span>
      })}
    </>
  )
}
