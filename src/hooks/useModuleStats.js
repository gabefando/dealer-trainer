import { useState, useEffect } from 'react'
import { getModuleStats, getLastSessions, calcReadiness } from '../services/db'

const SPEED_TARGETS = { 1: 5, 2: 6, 3: 4, 4: 3, 5: 4, 6: 10, 7: 6 }
const ADAPTIVE_UNLOCK_ATTEMPTS = 50

export function useModuleStats(moduleId) {
  const [stats, setStats] = useState(null)
  const [sessions, setSessions] = useState([])
  const [readiness, setReadiness] = useState(0)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    setLoading(true)
    try {
      const [s, sess] = await Promise.all([
        getModuleStats(moduleId),
        getLastSessions(moduleId, 10),
      ])
      setStats(s)
      setSessions(sess)
      setReadiness(calcReadiness(sess, SPEED_TARGETS[moduleId] || 5))
    } catch (err) {
      console.error('useModuleStats error', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [moduleId])

  const level3Unlocked = (stats?.totalAttempts || 0) >= ADAPTIVE_UNLOCK_ATTEMPTS

  return { stats, sessions, readiness, loading, refresh, level3Unlocked }
}

// For Home screen — all modules at once
export function useAllModuleStats() {
  const [allStats, setAllStats] = useState({})
  const [allReadiness, setAllReadiness] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const stats = {}
      const readiness = {}
      const speed = SPEED_TARGETS
      try {
        for (let i = 1; i <= 7; i++) {
          const [s, sess] = await Promise.all([
            getModuleStats(i),
            getLastSessions(i, 5),
          ])
          stats[i] = s
          readiness[i] = calcReadiness(sess, speed[i] || 5)
        }
        setAllStats(stats)
        setAllReadiness(readiness)
      } catch (err) {
        console.error('useAllModuleStats error', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Module 7 is locked until modules 1, 2, 3 all have 70%+ readiness
  const module7Unlocked =
    (allReadiness[1] || 0) >= 70 &&
    (allReadiness[2] || 0) >= 70 &&
    (allReadiness[3] || 0) >= 70

  const overallReadiness = Object.values(allReadiness).length
    ? Math.round(Object.values(allReadiness).reduce((a, b) => a + b, 0) / 7)
    : 0

  return { allStats, allReadiness, loading, module7Unlocked, overallReadiness }
}
