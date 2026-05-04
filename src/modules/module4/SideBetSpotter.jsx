import { useState, useEffect, useRef } from 'react'
import Chip from '../../components/Chip'
import { CHIP_TYPES } from '../../utils/chipUtils'
import { saveSession, recordMiss } from '../../services/db'

const MODULE_ID = 4

const LEVELS = [
  { level: 1, label: 'Level 1', desc: '3s exposure, 1–2 side bets max', exposure: 3000, maxSideBets: 2 },
  { level: 2, label: 'Level 2', desc: '1.5s exposure, up to 3 side bets', exposure: 1500, maxSideBets: 3 },
  { level: 3, label: 'Level 3 (Adaptive)', desc: '0.75s exposure, any side bets', exposure: 750, maxSideBets: 5, locked: false },
]

const SPOT_POSITIONS = [
  { x: '50%', y: '82%' },
  { x: '20%', y: '70%' },
  { x: '80%', y: '70%' },
  { x: '8%',  y: '52%' },
  { x: '92%', y: '52%' },
  { x: '30%', y: '40%' },
  { x: '70%', y: '40%' },
]

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }
function randChip() { return CHIP_TYPES[randInt(0, CHIP_TYPES.length - 1)] }

function generateScene(maxSideBets) {
  const numSpots = randInt(2, 5)
  const spotIndices = [...SPOT_POSITIONS.keys()].sort(() => Math.random() - 0.5).slice(0, numSpots)

  const sideBetCount = randInt(0, Math.min(maxSideBets, numSpots))
  const sideBetSpots = new Set(
    spotIndices.sort(() => Math.random() - 0.5).slice(0, sideBetCount)
  )

  const spots = spotIndices.map(idx => ({
    posIdx: idx,
    pos: SPOT_POSITIONS[idx],
    mainChip: randChip(),
    mainCount: randInt(1, 4),
    hasSideBet: sideBetSpots.has(idx),
    sideBetChip: randChip(),
    sideBetCount: randInt(1, 2),
  }))

  return { spots, sideBetSpots: [...sideBetSpots], spotIndices }
}

// ── Table scene renderer ──────────────────────────────────────────────────────
function TableScene({ scene, visible, labelMap = {} }) {
  return (
    <div style={{
      position: 'relative',
      width: '100%',
      aspectRatio: '1.6/1',
      maxHeight: 280,
      background: '#35654d',
      borderRadius: 120,
      overflow: 'hidden',
      border: '4px solid #1e4535',
      boxShadow: 'inset 0 0 40px rgba(0,0,0,0.4)',
    }}>
      {/* Dealer area */}
      <div style={{ position: 'absolute', top: '8%', left: '50%', transform: 'translateX(-50%)', fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 2 }}>
        DEALER
      </div>

      {visible && scene?.spots.map((spot, i) => {
        const [px, py] = [spot.pos.x, spot.pos.y]
        const label = labelMap[spot.posIdx]
        return (
          <div key={i} style={{
            position: 'absolute',
            left: px, top: py,
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}>
            {/* Betting circle */}
            <div style={{
              width: 50, height: 50,
              borderRadius: '50%',
              border: '1.5px solid rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative',
            }}>
              {/* Main bet */}
              <Chip chip={spot.mainChip} size={32} />

              {/* Side bet — upper right offset */}
              {spot.hasSideBet && (
                <div style={{ position: 'absolute', top: -10, right: -10 }}>
                  <Chip chip={spot.sideBetChip} size={22} />
                </div>
              )}
            </div>
            {/* Label overlay */}
            {label && (
              <div style={{
                marginTop: 2,
                fontSize: 10,
                background: label === 'YES' ? 'rgba(34,197,94,0.85)' : 'rgba(239,68,68,0.85)',
                color: 'white',
                borderRadius: 4,
                padding: '1px 5px',
                fontWeight: 700,
              }}>{label}</div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Level selector ────────────────────────────────────────────────────────────
function LevelSelect({ level3Unlocked, onStart }) {
  const [lvl, setLvl] = useState(1)
  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14, flex: 1, justifyContent: 'center', maxWidth: 400, margin: '0 auto', width: '100%' }}>
      <div style={{ textAlign: 'center', fontSize: 13, color: '#9ca3af' }}>
        A table will flash briefly — identify which spots have a Lucky Ladies side bet
      </div>
      {LEVELS.map(({ level, label, desc, locked }) => (
        <button key={level} onClick={() => setLvl(level)} disabled={level === 3 && !level3Unlocked}
          style={{
            background: lvl === level ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.05)',
            border: `1.5px solid ${lvl === level ? '#FFD700' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: 12, padding: '12px 16px',
            color: level === 3 && !level3Unlocked ? '#555' : 'white',
            textAlign: 'left', cursor: level === 3 && !level3Unlocked ? 'not-allowed' : 'pointer', fontFamily: 'Inter, system-ui',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 15 }}>{label} {level === 3 && !level3Unlocked && '🔒'}</div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{desc}</div>
        </button>
      ))}
      <button onClick={() => onStart(lvl)}
        style={{ background: '#FFD700', color: '#1a1a2e', border: 'none', borderRadius: 12, padding: '16px', fontSize: 17, fontWeight: 800, cursor: 'pointer', marginTop: 4, fontFamily: 'Inter, system-ui' }}>
        Start
      </button>
    </div>
  )
}

// ── Game ──────────────────────────────────────────────────────────────────────
const ROUNDS_PER_SESSION = 15

function GameRound({ level, onFinish }) {
  const config = LEVELS[level - 1]
  const [round, setRound] = useState(0)
  const [scene, setScene] = useState(null)
  const [phase, setPhase] = useState('idle') // idle | showing | answering | feedback
  const [selected, setSelected] = useState(new Set())
  const [none, setNone] = useState(false)
  const [results, setResults] = useState([])
  const [labelMap, setLabelMap] = useState({})
  const timerRef = useRef(null)

  const startRound = () => {
    const s = generateScene(config.maxSideBets)
    setScene(s)
    setSelected(new Set())
    setNone(false)
    setLabelMap({})
    setPhase('showing')
    timerRef.current = setTimeout(() => setPhase('answering'), config.exposure)
  }

  useEffect(() => {
    startRound()
    return () => clearTimeout(timerRef.current)
  }, [round])

  const toggleSpot = (posIdx) => {
    if (none) setNone(false)
    setSelected(prev => {
      const next = new Set(prev)
      next.has(posIdx) ? next.delete(posIdx) : next.add(posIdx)
      return next
    })
  }

  const handleNone = () => { setNone(n => !n); setSelected(new Set()) }

  const submit = () => {
    const correctSet = new Set(scene.sideBetSpots)
    const userSet = none ? new Set() : selected

    // Build label map for feedback
    const lm = {}
    for (const spot of scene.spots) {
      const idx = spot.posIdx
      const inCorrect = correctSet.has(idx)
      const inUser = userSet.has(idx)
      if (inCorrect && inUser) lm[idx] = 'YES'
      else if (inCorrect && !inUser) lm[idx] = 'MISS'
      else if (!inCorrect && inUser) lm[idx] = 'WRONG'
    }
    setLabelMap(lm)

    const correct = [...correctSet].every(i => userSet.has(i)) && [...userSet].every(i => correctSet.has(i))
    setResults(prev => [...prev, { scene: { ...scene }, correct, userSpots: [...userSet], correctSpots: [...correctSet] }])
    setPhase('feedback')
  }

  const next = () => {
    if (round + 1 >= ROUNDS_PER_SESSION) {
      onFinish(results.concat()) // will be called after state update
      return
    }
    setRound(r => r + 1)
  }

  const hasSideBets = scene?.sideBetSpots.length > 0

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '12px 16px', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: '#9ca3af' }}>
        <span>Round {round + 1}/{ROUNDS_PER_SESSION}</span>
        <span>{results.filter(r => r.correct).length}/{results.length} correct</span>
      </div>

      {/* Table */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        {phase === 'showing' && <TableScene scene={scene} visible={true} />}
        {phase === 'answering' && <TableScene scene={scene} visible={false} />}
        {phase === 'feedback' && <TableScene scene={scene} visible={true} labelMap={labelMap} />}
        {phase === 'idle' && <div style={{ width: '100%', aspectRatio: '1.6/1', maxHeight: 280, background: '#1e4535', borderRadius: 120 }} />}
      </div>

      {phase === 'showing' && (
        <div style={{ textAlign: 'center', color: '#FFD700', fontSize: 15, fontWeight: 600, animation: 'pulse 0.5s infinite alternate' }}>
          Watch closely…
        </div>
      )}

      {phase === 'answering' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ textAlign: 'center', fontSize: 14, color: 'white', fontWeight: 600 }}>
            Which spots had a Lucky Ladies side bet?
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {scene.spotIndices.map((posIdx, i) => (
              <button key={posIdx} onClick={() => toggleSpot(posIdx)}
                style={{
                  background: selected.has(posIdx) ? 'rgba(255,215,0,0.2)' : 'rgba(255,255,255,0.07)',
                  border: `2px solid ${selected.has(posIdx) ? '#FFD700' : 'rgba(255,255,255,0.2)'}`,
                  borderRadius: 10, padding: '10px 16px', color: 'white',
                  fontFamily: 'Inter, system-ui', fontWeight: 600, cursor: 'pointer', fontSize: 15,
                }}>
                Spot {i + 1}
              </button>
            ))}
            <button onClick={handleNone}
              style={{
                background: none ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.07)',
                border: `2px solid ${none ? '#6366f1' : 'rgba(255,255,255,0.2)'}`,
                borderRadius: 10, padding: '10px 16px', color: none ? '#a5b4fc' : 'white',
                fontFamily: 'Inter, system-ui', fontWeight: 600, cursor: 'pointer', fontSize: 15,
              }}>
              None
            </button>
          </div>
          <button onClick={submit}
            style={{ background: '#FFD700', color: '#1a1a2e', border: 'none', borderRadius: 12, padding: '14px', fontSize: 16, fontWeight: 800, cursor: 'pointer', fontFamily: 'Inter, system-ui', marginTop: 4 }}>
            Submit Answer
          </button>
        </div>
      )}

      {phase === 'feedback' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ textAlign: 'center', fontSize: 20, fontWeight: 700, color: results[results.length - 1]?.correct ? '#22c55e' : '#ef4444' }}>
            {results[results.length - 1]?.correct ? '✓ Correct!' : '✗ Missed'}
          </div>
          <div style={{ textAlign: 'center', fontSize: 13, color: '#9ca3af' }}>
            {hasSideBets ? `Side bet on ${scene.sideBetSpots.length} spot(s)` : 'No side bets'}
          </div>
          <button onClick={next}
            style={{ background: '#FFD700', color: '#1a1a2e', border: 'none', borderRadius: 12, padding: '14px', fontSize: 16, fontWeight: 800, cursor: 'pointer', fontFamily: 'Inter, system-ui' }}>
            {round + 1 >= ROUNDS_PER_SESSION ? 'See Results' : 'Next Round →'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Results ───────────────────────────────────────────────────────────────────
function Results({ results, onHome }) {
  const correct = results.filter(r => r.correct).length
  const accuracy = results.length ? Math.round((correct / results.length) * 100) : 0
  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 400, margin: '0 auto', width: '100%' }}>
      <h2 style={{ margin: 0, textAlign: 'center', color: 'white', fontSize: 22 }}>Session Complete!</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[['Rounds', results.length], ['Correct', `${correct} (${accuracy}%)`]].map(([l, v]) => (
          <div key={l} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>{l}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#FFD700' }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ color: accuracy >= 80 ? '#22c55e' : '#f59e0b', textAlign: 'center', fontSize: 14 }}>
        {accuracy >= 80 ? '✓ Sharp eye!' : 'Keep practicing your visual scanning'}
      </div>
      <button onClick={onHome}
        style={{ background: '#FFD700', color: '#1a1a2e', border: 'none', borderRadius: 12, padding: '14px', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'Inter, system-ui' }}>
        Done
      </button>
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function SideBetSpotter() {
  const [phase, setPhase] = useState('select')
  const [level, setLevel] = useState(1)
  const [results, setResults] = useState([])
  const [level3Unlocked] = useState(false)

  const handleFinish = async (res) => {
    setResults(res)
    const correct = res.filter(r => r.correct).length
    const accuracy = res.length ? (correct / res.length) * 100 : 0
    await saveSession(MODULE_ID, { totalQuestions: res.length, correct, accuracy, avgTime: 0, score: correct, level }).catch(() => {})
    setPhase('results')
  }

  if (phase === 'select') return <LevelSelect level3Unlocked={level3Unlocked} onStart={(l) => { setLevel(l); setPhase('game') }} />
  if (phase === 'game') return <GameRound key={phase + level} level={level} onFinish={handleFinish} />
  if (phase === 'results') return <Results results={results} onHome={() => setPhase('select')} />
}
