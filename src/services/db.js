// Firestore abstraction layer
// All reads/writes go through here so Firebase Auth can be swapped in later
// without touching any module code.
import {
  doc, collection, getDoc, setDoc, addDoc, updateDoc,
  query, orderBy, limit, getDocs, increment, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'

export const GUEST_USER_ID = 'guest_1'

// ── Path helpers ──────────────────────────────────────────────────────────────

const userRef = () => doc(db, 'users', GUEST_USER_ID)
const moduleRef = (moduleId) => doc(db, 'users', GUEST_USER_ID, 'modules', String(moduleId))
const sessionsRef = (moduleId) => collection(db, 'users', GUEST_USER_ID, 'modules', String(moduleId), 'sessions')
const weakSpotsRef = (moduleId) => collection(db, 'users', GUEST_USER_ID, 'modules', String(moduleId), 'weakSpots')
const weakSpotRef = (moduleId, itemId) => doc(db, 'users', GUEST_USER_ID, 'modules', String(moduleId), 'weakSpots', String(itemId))

// ── Module stats ──────────────────────────────────────────────────────────────

export async function getModuleStats(moduleId) {
  const snap = await getDoc(moduleRef(moduleId))
  return snap.exists() ? snap.data() : {
    totalAttempts: 0,
    accuracy: 0,
    avgTime: 0,
    personalBest: 0,
    readiness: 0,
    lastSessionAt: null,
  }
}

export async function saveSession(moduleId, sessionData) {
  // sessionData: { totalQuestions, correct, accuracy, avgTime, score, level }
  const { totalQuestions, correct, accuracy, avgTime, score } = sessionData

  // Save session document
  await addDoc(sessionsRef(moduleId), {
    ...sessionData,
    timestamp: serverTimestamp(),
  })

  // Update module summary stats
  const existing = await getModuleStats(moduleId)
  const newTotal = (existing.totalAttempts || 0) + totalQuestions
  const newCorrect = Math.round((existing.accuracy / 100) * (existing.totalAttempts || 0)) + correct
  const newAccuracy = newTotal > 0 ? (newCorrect / newTotal) * 100 : 0
  const newAvgTime = existing.totalAttempts
    ? ((existing.avgTime * existing.totalAttempts) + (avgTime * totalQuestions)) / newTotal
    : avgTime
  const newPersonalBest = Math.max(existing.personalBest || 0, score)

  await setDoc(moduleRef(moduleId), {
    totalAttempts: newTotal,
    accuracy: Math.round(newAccuracy * 10) / 10,
    avgTime: Math.round(newAvgTime * 10) / 10,
    personalBest: newPersonalBest,
    lastSessionAt: serverTimestamp(),
  }, { merge: true })

  return { newAccuracy, newAvgTime, newPersonalBest }
}

export async function getLastSessions(moduleId, count = 10) {
  const q = query(sessionsRef(moduleId), orderBy('timestamp', 'desc'), limit(count))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

// ── Weak spots ────────────────────────────────────────────────────────────────

export async function recordMiss(moduleId, itemId, itemData) {
  const ref = weakSpotRef(moduleId, itemId)
  const snap = await getDoc(ref)
  if (snap.exists()) {
    await updateDoc(ref, { missCount: increment(1), lastSeen: serverTimestamp() })
  } else {
    await setDoc(ref, { missCount: 1, lastSeen: serverTimestamp(), data: itemData })
  }
}

export async function getWeakSpots(moduleId) {
  const snap = await getDocs(weakSpotsRef(moduleId))
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(ws => ws.missCount >= 2)
    .sort((a, b) => b.missCount - a.missCount)
}

export async function clearWeakSpot(moduleId, itemId) {
  const ref = weakSpotRef(moduleId, itemId)
  await setDoc(ref, { missCount: 0 }, { merge: true })
}

// ── Readiness calculation ─────────────────────────────────────────────────────
// Readiness = 60% recent accuracy + 40% speed score
// Speed score = % of recent sessions where avgTime <= speedTarget

export function calcReadiness(sessions, speedTarget) {
  if (!sessions.length) return 0
  const recent = sessions.slice(0, 5)
  const recentAccuracy = recent.reduce((sum, s) => sum + (s.accuracy || 0), 0) / recent.length
  const speedScore = recent.filter(s => (s.avgTime || 999) <= speedTarget).length / recent.length * 100
  return Math.round(0.6 * recentAccuracy + 0.4 * speedScore)
}

// ── All-module overview ───────────────────────────────────────────────────────

export async function getAllModuleStats() {
  const results = {}
  for (let i = 1; i <= 7; i++) {
    results[i] = await getModuleStats(i)
  }
  return results
}
