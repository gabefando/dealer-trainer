import { useState, useEffect, useRef, useCallback } from 'react'

export function useCountdown(seconds) {
  const [timeLeft, setTimeLeft] = useState(seconds)
  const [running, setRunning] = useState(false)
  const intervalRef = useRef(null)

  const start = useCallback(() => {
    setTimeLeft(seconds)
    setRunning(true)
  }, [seconds])

  const stop = useCallback(() => {
    setRunning(false)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }, [])

  const reset = useCallback(() => {
    stop()
    setTimeLeft(seconds)
  }, [seconds, stop])

  useEffect(() => {
    if (!running) return
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current)
          setRunning(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [running])

  const isExpired = timeLeft === 0

  return { timeLeft, running, isExpired, start, stop, reset }
}

// Measures elapsed time between start/stop calls
export function useStopwatch() {
  const startRef = useRef(null)

  const startTiming = () => { startRef.current = Date.now() }
  const stopTiming = () => {
    if (!startRef.current) return 0
    const elapsed = (Date.now() - startRef.current) / 1000
    startRef.current = null
    return elapsed
  }

  return { startTiming, stopTiming }
}
