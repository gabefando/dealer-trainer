import { useState, useEffect, useRef, useCallback } from 'react'
import ChipStack from '../../components/ChipStack'
import Timer from '../../components/Timer'
import { useCountdown, useStopwatch } from '../../hooks/useTimer'
import { generatePayoutQuestion, WIN_TYPES } from '../../utils/payoutUtils'
import { saveSession, recordMiss, getWeakSpots } from '../../services/db'

const MODULE_ID = 2
const SPRINT_SECS = 120
const SPEED_TARGET = 6

function formatVal(v) {
  if (v === undefined || v === null || isNaN(v)) return '—'
  if (v === Math.floor(v)) return `$${v}`
  return `$${v.toFixed(2)}`
}

function btnStyle(bg, color, border) {
  return {
    background: bg, color, border: `1.5px solid ${border || color}`,
    borderRadius: 12, padding: '14px', fontSize: 15,
    fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, system-ui',
  }
}

// ── Level + mode selector ─────────────────────────────────────────────────────
function LevelSelect({ level3Unlocked, onStart }) {
  const [lvl, setLvl] = useState(1)
  const [mode, setMode] = useState('guided')
  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14, flex: 1, justifyContent: 'center', maxWidth: 420, margin: '0 auto', width: '100%' }}>
      <div style={{ textAlign: 'center', marginBottom: 4 }}>
        <div style={{ fontSize: 13, color: '#9ca3af' }}>2-minute sprint · target &lt;{SPEED_TARGET}s/calc</div>
      </div>

      <div style={{ fontSize: 13, color: '#FFD700', fontWeight: 600 }}>Level</div>
      {[1, 2, 3].map(l => (
        <button key={l} onClick={() => setLvl(l)} disabled={l === 3 && !level3Unlocked}
          style={{
            background: lvl === l ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.05)',
            border: `1.5px solid ${lvl === l ? '#FFD700' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: 12, padding: '12px 16px',
            color: l === 3 && !level3Unlocked ? '#555' : 'white',
            textAlign: 'left', cursor: l === 3 && !level3Unlocked ? 'not-allowed' : 'pointer',
            fontFamily: 'Inter, system-ui',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 15 }}>Level {l} {l === 3 && !level3Unlocked && '🔒'}</div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
            {l === 1 && 'Regular wins & BJ — guided hints'}
            {l === 2 && 'All payout types including 3:2 with pinks'}
            {l === 3 && (level3Unlocked ? 'Adaptive — weighted to your weak spots' : 'Unlock at 50+ attempts')}
          </div>
        </button>
      ))}

      <div style={{ fontSize: 13, color: '#FFD700', fontWeight: 600, marginTop: 4 }}>Mode</div>
      {['guided', 'blind'].map(m => (
        <button key={m} onClick={() => setMode(m)}
          style={{
            background: mode === m ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.05)',
            border: `1.5px solid ${mode === m ? '#FFD700' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: 12, padding: '12px 16px',
            color: 'white', textAlign: 'left', cursor: 'pointer', fontFamily: 'Inter, system-ui',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 15 }}>{m === 'guided' ? 'Guided' : 'Blind'}</div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
            {m === 'guided' ? 'Shows ratio hint (e.g. "3:2")' : 'No hints — recall from memory'}
          </div>
        </button>
      ))}

      <button onClick={() => onStart(lvl, mode)}
        style={{ background: '#FFD700', color: '#1a1a2e', border: 'none', borderRadius: 12, padding: '16px', fontSize: 17, fontWeight: 800, cursor: 'pointer', marginTop: 4, fontFamily: 'Inter, system-ui' }}>
        Start Sprint
      </button>
    </div>
  )
}

// ── Sprint ─────────────────────────────────────────────────────────────────────
function Sprint({ level, mode, weakItems, onFinish }) {
  const { timeLeft, running, isExpired, start } = useCountdown(SPRINT_SECS)
  const { startTiming, stopTiming } = useStopwatch()
  const [question, setQuestion] = useState(null)
  const [answer, setAnswer] = useState('')
  const [results, setResults] = useState([])
  const [started, setStarted] = useState(false)
  const inputRef = useRef(null)

  const nextQ = useCallback(() => {
    setQuestion(generatePayoutQuestion(level, weakItems))
    setAnswer('')
    startTiming()
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [level, weakItems, startTiming])

  useEffect(() => {
    if (isExpired && started) onFinish(results)
  }, [isExpired, started, results, onFinish])

  const handleStart = () => { setStarted(true); start(); nextQ() }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!question || !running) return
    const elapsed = stopTiming()
    const parsed = parseFloat(answer.replace(/[$,]/g, ''))
    const correct = Math.abs(parsed - question.correctPayout) < 0.005
    setResults(prev => [...prev, { question, userAnswer: parsed, correct, time: elapsed }])
    nextQ()
  }

  if (!started) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <button onClick={handleStart}
          style={{ background: '#FFD700', color: '#1a1a2e', border: 'none', borderRadius: 16, padding: '20px 48px', fontSize: 20, fontWeight: 800, cursor: 'pointer', fontFamily: 'Inter, system-ui' }}>
          Tap to Begin
        </button>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '10px 20px 16px', gap: 10, minHeight: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <Timer timeLeft={timeLeft} total={SPRINT_SECS} />
        <div style={{ fontSize: 13, color: '#9ca3af' }}>{results.filter(r => r.correct).length}/{results.length}</div>
      </div>

      {/* Win type */}
      <div style={{ textAlign: 'center', flexShrink: 0 }}>
        <div style={{
          display: 'inline-block',
          background: 'rgba(255,215,0,0.12)',
          border: '1px solid rgba(255,215,0,0.3)',
          borderRadius: 8,
          padding: '6px 16px',
          fontSize: 15,
          fontWeight: 700,
          color: '#FFD700',
        }}>
          {question?.winType.label}
        </div>
        {mode === 'guided' && (
          <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>
            Pays {question?.winType.hint}
          </div>
        )}
      </div>

      {/* Chips — fills remaining space */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {question && <ChipStack chipCounts={question.chips} size={52} />}
      </div>

      {/* Input */}
      <div style={{ flexShrink: 0 }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10 }}>
        <input
          ref={inputRef}
          type="number"
          inputMode="numeric"
          value={answer}
          onChange={e => setAnswer(e.target.value)}
          placeholder="Payout amount"
          step="0.01"
          style={{
            flex: 1, background: 'rgba(255,255,255,0.08)',
            border: '2px solid rgba(255,215,0,0.3)', borderRadius: 12,
            padding: '14px 16px', fontSize: 22, fontWeight: 700,
            color: 'white', fontFamily: 'Inter, system-ui', outline: 'none',
          }}
          autoComplete="off"
        />
        <button type="submit"
          style={{ background: '#FFD700', color: '#1a1a2e', border: 'none', borderRadius: 12, padding: '14px 20px', fontSize: 20, fontWeight: 800, cursor: 'pointer' }}>
          ✓
        </button>
      </form>
      </div>
    </div>
  )
}

// ── Results ───────────────────────────────────────────────────────────────────
function Results({ results, onReview, onRedo, onHome }) {
  const correct = results.filter(r => r.correct).length
  const accuracy = results.length ? Math.round((correct / results.length) * 100) : 0
  const avgTime = results.length ? Math.round(results.reduce((s, r) => s + r.time, 0) / results.length * 10) / 10 : 0
  const missed = results.filter(r => !r.correct)

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 400, margin: '0 auto', width: '100%' }}>
      <h2 style={{ margin: 0, textAlign: 'center', color: 'white', fontSize: 22 }}>Sprint Complete!</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[['Total', results.length], ['Correct', `${correct} (${accuracy}%)`], ['Avg Time', `${avgTime}s`], ['Target', `<${SPEED_TARGET}s`]].map(([l, v]) => (
          <div key={l} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>{l}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#FFD700' }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ color: avgTime <= SPEED_TARGET ? '#22c55e' : '#f59e0b', textAlign: 'center', fontSize: 14 }}>
        {avgTime <= SPEED_TARGET ? `✓ Under ${SPEED_TARGET}s target!` : `Avg ${avgTime}s — target under ${SPEED_TARGET}s`}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {missed.length > 0 && <>
          <button onClick={onReview} style={btnStyle('#1e4535', '#22c55e')}>Review Missed ({missed.length})</button>
          <button onClick={onRedo} style={btnStyle('#1a1a2e', '#FFD700')}>Redo Missed (untimed)</button>
        </>}
        <button onClick={onHome} style={btnStyle('#FFD700', '#1a1a2e')}>Done</button>
      </div>
    </div>
  )
}

// ── Review/Redo ───────────────────────────────────────────────────────────────
function ReviewMode({ missed, redo, onDone }) {
  const [idx, setIdx] = useState(0)
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState(null)
  const inputRef = useRef(null)

  if (idx >= missed.length) {
    return <div style={{ padding: 32, textAlign: 'center' }}>
      <div style={{ fontSize: 20, color: '#22c55e', marginBottom: 24 }}>✓ All done!</div>
      <button onClick={onDone} style={btnStyle('#FFD700', '#1a1a2e')}>Back</button>
    </div>
  }

  const cur = missed[idx]

  const submit = (e) => {
    e.preventDefault()
    if (!redo) { setIdx(i => i + 1); return }
    const parsed = parseFloat(answer.replace(/[$,]/g, ''))
    setFeedback({ correct: Math.abs(parsed - cur.question.correctPayout) < 0.005, val: cur.question.correctPayout })
  }

  const next = () => { setFeedback(null); setAnswer(''); setIdx(i => i + 1); setTimeout(() => inputRef.current?.focus(), 50) }

  return (
    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#9ca3af' }}>
        <span>{redo ? 'Redo' : 'Review'} Missed</span>
        <span>{idx + 1}/{missed.length}</span>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ display: 'inline-block', background: 'rgba(255,215,0,0.12)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 8, padding: '6px 16px', fontSize: 15, fontWeight: 700, color: '#FFD700' }}>
          {cur.question.winType.label} · Pays {cur.question.winType.hint}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', minHeight: 120 }}>
        <ChipStack chipCounts={cur.question.chips} size={52} />
      </div>
      <div style={{ textAlign: 'center', fontSize: 13, color: '#9ca3af' }}>Bet: <span style={{ color: 'white' }}>{formatVal(cur.question.betAmount)}</span></div>
      {!redo ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#9ca3af', fontSize: 13 }}>Your: <span style={{ color: '#ef4444' }}>{formatVal(cur.userAnswer)}</span></div>
          <div style={{ color: '#22c55e', fontSize: 20, fontWeight: 700 }}>Correct: {formatVal(cur.question.correctPayout)}</div>
        </div>
      ) : feedback ? (
        <div style={{ textAlign: 'center', fontSize: 22, color: feedback.correct ? '#22c55e' : '#ef4444', fontWeight: 700 }}>
          {feedback.correct ? '✓ Correct!' : `✗ Answer: ${formatVal(feedback.val)}`}
        </div>
      ) : (
        <form onSubmit={submit} style={{ display: 'flex', gap: 10 }}>
          <input ref={inputRef} type="number" inputMode="numeric" value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Payout amount" step="0.01"
            style={{ flex: 1, background: 'rgba(255,255,255,0.08)', border: '2px solid rgba(255,215,0,0.3)', borderRadius: 12, padding: '14px 16px', fontSize: 22, fontWeight: 700, color: 'white', fontFamily: 'Inter, system-ui', outline: 'none' }}
            autoFocus autoComplete="off" />
          <button type="submit" style={{ background: '#FFD700', color: '#1a1a2e', border: 'none', borderRadius: 12, padding: '14px 20px', fontSize: 20, fontWeight: 800, cursor: 'pointer' }}>✓</button>
        </form>
      )}
      <button onClick={feedback ? next : (!redo ? () => setIdx(i => i + 1) : undefined)} style={btnStyle('rgba(255,255,255,0.06)', 'white')}>
        {idx < missed.length - 1 ? 'Next →' : 'Finish'}
      </button>
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function PayoutCalculator() {
  const [phase, setPhase] = useState('select')
  const [level, setLevel] = useState(1)
  const [mode, setMode] = useState('guided')
  const [results, setResults] = useState([])
  const [weakItems, setWeakItems] = useState([])
  const [level3Unlocked] = useState(false)

  useEffect(() => {
    getWeakSpots(MODULE_ID).then(setWeakItems).catch(() => {})
  }, [])

  const handleFinish = async (res) => {
    setResults(res)
    const correct = res.filter(r => r.correct).length
    const accuracy = res.length ? (correct / res.length) * 100 : 0
    const avgTime = res.length ? res.reduce((s, r) => s + r.time, 0) / res.length : 0
    for (const r of res) {
      if (!r.correct) await recordMiss(MODULE_ID, r.question.key, { winTypeId: r.question.winType.id, betAmount: r.question.betAmount }).catch(() => {})
    }
    await saveSession(MODULE_ID, { totalQuestions: res.length, correct, accuracy, avgTime, score: correct, level, mode }).catch(() => {})
    setPhase('results')
  }

  if (phase === 'select') return <LevelSelect level3Unlocked={level3Unlocked} onStart={(l, m) => { setLevel(l); setMode(m); setPhase('sprint') }} />
  if (phase === 'sprint') return <Sprint level={level} mode={mode} weakItems={weakItems} onFinish={handleFinish} />
  if (phase === 'results') return <Results results={results} onReview={() => setPhase('review')} onRedo={() => setPhase('redo')} onHome={() => setPhase('select')} />
  if (phase === 'review') return <ReviewMode missed={results.filter(r => !r.correct)} redo={false} onDone={() => setPhase('results')} />
  if (phase === 'redo') return <ReviewMode missed={results.filter(r => !r.correct)} redo={true} onDone={() => setPhase('results')} />
}
