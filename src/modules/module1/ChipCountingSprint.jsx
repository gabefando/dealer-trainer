import { useState, useEffect, useRef, useCallback } from 'react'
import ChipStack from '../../components/ChipStack'
import Timer from '../../components/Timer'
import { useCountdown, useStopwatch } from '../../hooks/useTimer'
import { generateChipQuestion, chipQuestionKey } from '../../utils/chipUtils'
import { saveSession, recordMiss, getWeakSpots } from '../../services/db'

const MODULE_ID = 1
const SPRINT_SECS = 120
const SPEED_TARGET = 5

function formatVal(v) {
  if (v === Math.floor(v)) return `$${v}`
  return `$${v.toFixed(2)}`
}

// ── Level selector ────────────────────────────────────────────────────────────
function LevelSelect({ level3Unlocked, onStart }) {
  const [lvl, setLvl] = useState(1)
  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, flex: 1, justifyContent: 'center', maxWidth: 400, margin: '0 auto', width: '100%' }}>
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 4 }}>2-minute sprint · target &lt;{SPEED_TARGET}s/calc</div>
        <div style={{ fontSize: 13, color: '#9ca3af' }}>Type the total value of the chip stack(s) shown</div>
      </div>
      {[1, 2, 3].map(l => (
        <button
          key={l}
          onClick={() => setLvl(l)}
          disabled={l === 3 && !level3Unlocked}
          style={{
            background: lvl === l ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.05)',
            border: `1.5px solid ${lvl === l ? '#FFD700' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: 12,
            padding: '14px 16px',
            color: l === 3 && !level3Unlocked ? '#555' : 'white',
            textAlign: 'left',
            cursor: l === 3 && !level3Unlocked ? 'not-allowed' : 'pointer',
            fontFamily: 'Inter, system-ui',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 15 }}>
            Level {l} {l === 3 && !level3Unlocked && '🔒'}
          </div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
            {l === 1 && 'Single denomination stacks'}
            {l === 2 && 'Mixed denominations, round totals'}
            {l === 3 && (level3Unlocked ? 'Adaptive — mixed including pinks, multiple circles' : 'Unlock at 50+ attempts')}
          </div>
        </button>
      ))}
      <button
        onClick={() => onStart(lvl)}
        style={{
          background: '#FFD700',
          color: '#1a1a2e',
          border: 'none',
          borderRadius: 12,
          padding: '16px',
          fontSize: 17,
          fontWeight: 800,
          cursor: 'pointer',
          marginTop: 8,
          fontFamily: 'Inter, system-ui',
        }}
      >
        Start Sprint
      </button>
    </div>
  )
}

// ── Sprint ─────────────────────────────────────────────────────────────────────
function Sprint({ level, weakAmounts, onFinish }) {
  const { timeLeft, running, isExpired, start } = useCountdown(SPRINT_SECS)
  const { startTiming, stopTiming } = useStopwatch()
  const [question, setQuestion] = useState(null)
  const [answer, setAnswer] = useState('')
  const [results, setResults] = useState([]) // { question, userAnswer, correct, time }
  const [started, setStarted] = useState(false)
  const inputRef = useRef(null)

  const nextQuestion = useCallback(() => {
    setQuestion(generateChipQuestion(level, weakAmounts))
    setAnswer('')
    startTiming()
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [level, weakAmounts, startTiming])

  useEffect(() => {
    if (isExpired && started) {
      onFinish(results)
    }
  }, [isExpired, started, results, onFinish])

  const handleStart = () => {
    setStarted(true)
    start()
    nextQuestion()
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!question || !running) return
    const elapsed = stopTiming()
    const parsed = parseFloat(answer.replace(/[$,]/g, ''))
    const correct = Math.abs(parsed - question.total) < 0.005
    setResults(prev => [...prev, {
      question,
      userAnswer: parsed,
      correct,
      time: elapsed,
    }])
    nextQuestion()
  }

  if (!started) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <button
          onClick={handleStart}
          style={{
            background: '#FFD700', color: '#1a1a2e', border: 'none',
            borderRadius: 16, padding: '20px 48px', fontSize: 20,
            fontWeight: 800, cursor: 'pointer', fontFamily: 'Inter, system-ui',
          }}
        >
          Tap to Begin
        </button>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '12px 20px', gap: 12 }}>
      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Timer timeLeft={timeLeft} total={SPRINT_SECS} />
        <div style={{ fontSize: 13, color: '#9ca3af' }}>
          {results.length} answered · {results.filter(r => r.correct).length} correct
        </div>
      </div>

      {/* Chip display */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 32,
        flexWrap: 'wrap',
        minHeight: 160,
      }}>
        {question?.stacks.map((stack, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            {question.stacks.length > 1 && (
              <div style={{ fontSize: 11, color: '#9ca3af', letterSpacing: 1 }}>BET {i + 1}</div>
            )}
            <ChipStack chipCounts={stack} size={52} />
          </div>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10 }}>
        <input
          ref={inputRef}
          type="number"
          inputMode="numeric"
          value={answer}
          onChange={e => setAnswer(e.target.value)}
          placeholder="Total value"
          step="0.01"
          style={{
            flex: 1,
            background: 'rgba(255,255,255,0.08)',
            border: '2px solid rgba(255,215,0,0.3)',
            borderRadius: 12,
            padding: '14px 16px',
            fontSize: 22,
            fontWeight: 700,
            color: 'white',
            fontFamily: 'Inter, system-ui',
            outline: 'none',
          }}
          autoComplete="off"
        />
        <button
          type="submit"
          style={{
            background: '#FFD700',
            color: '#1a1a2e',
            border: 'none',
            borderRadius: 12,
            padding: '14px 20px',
            fontSize: 20,
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          ✓
        </button>
      </form>
      <div style={{ fontSize: 12, color: '#555', textAlign: 'center' }}>
        Target: &lt;{SPEED_TARGET}s per calculation
      </div>
    </div>
  )
}

// ── Results ───────────────────────────────────────────────────────────────────
function Results({ results, level, onReview, onRedo, onHome }) {
  const correct = results.filter(r => r.correct).length
  const accuracy = results.length ? Math.round((correct / results.length) * 100) : 0
  const avgTime = results.length
    ? Math.round((results.reduce((s, r) => s + r.time, 0) / results.length) * 10) / 10
    : 0
  const missed = results.filter(r => !r.correct)
  const hitTarget = results.filter(r => r.time <= SPEED_TARGET).length

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 400, margin: '0 auto', width: '100%' }}>
      <h2 style={{ margin: 0, textAlign: 'center', color: 'white', fontSize: 22 }}>Sprint Complete!</h2>

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
      }}>
        {[
          ['Total', results.length],
          ['Correct', `${correct} (${accuracy}%)`],
          ['Avg Time', `${avgTime}s`],
          ['On Target', `${hitTarget}/${results.length}`],
        ].map(([label, value]) => (
          <div key={label} style={{
            background: 'rgba(255,255,255,0.06)',
            borderRadius: 12, padding: '12px 14px',
          }}>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>{label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#FFD700' }}>{value}</div>
          </div>
        ))}
      </div>

      {avgTime <= SPEED_TARGET ? (
        <div style={{ color: '#22c55e', textAlign: 'center', fontSize: 14 }}>
          ✓ Under {SPEED_TARGET}s target — great pace!
        </div>
      ) : (
        <div style={{ color: '#f59e0b', textAlign: 'center', fontSize: 14 }}>
          Avg {avgTime}s — target is under {SPEED_TARGET}s
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {missed.length > 0 && (
          <>
            <button onClick={onReview} style={btnStyle('#1e4535', '#22c55e')}>
              Review Missed ({missed.length})
            </button>
            <button onClick={onRedo} style={btnStyle('#1a1a2e', '#FFD700')}>
              Redo Missed (untimed)
            </button>
          </>
        )}
        <button onClick={onHome} style={btnStyle('#FFD700', '#1a1a2e')}>
          Done
        </button>
      </div>
    </div>
  )
}

function btnStyle(bg, color) {
  return {
    background: bg, color, border: `1.5px solid ${color}`, borderRadius: 12,
    padding: '14px', fontSize: 15, fontWeight: 700, cursor: 'pointer',
    fontFamily: 'Inter, system-ui',
  }
}

// ── Review / Redo ─────────────────────────────────────────────────────────────
function ReviewMode({ missed, redo, onDone }) {
  const [idx, setIdx] = useState(0)
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState(null)
  const inputRef = useRef(null)

  const current = missed[idx]

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!redo) { setIdx(i => i + 1); return }
    const parsed = parseFloat(answer.replace(/[$,]/g, ''))
    const correct = Math.abs(parsed - current.question.total) < 0.005
    setFeedback({ correct, correct_val: current.question.total })
  }

  const next = () => { setFeedback(null); setAnswer(''); setIdx(i => i + 1); setTimeout(() => inputRef.current?.focus(), 50) }

  if (idx >= missed.length) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 20, color: '#22c55e', marginBottom: 24 }}>✓ All done!</div>
        <button onClick={onDone} style={btnStyle('#FFD700', '#1a1a2e')}>Back</button>
      </div>
    )
  }

  return (
    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#9ca3af' }}>
        <span>{redo ? 'Redo' : 'Review'} Missed</span>
        <span>{idx + 1}/{missed.length}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap', minHeight: 140 }}>
        {current.question.stacks.map((stack, i) => (
          <ChipStack key={i} chipCounts={stack} size={52} />
        ))}
      </div>
      {!redo ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#9ca3af', fontSize: 13, marginBottom: 4 }}>Your answer: <span style={{ color: '#ef4444' }}>{formatVal(current.userAnswer)}</span></div>
          <div style={{ color: '#22c55e', fontSize: 20, fontWeight: 700 }}>Correct: {formatVal(current.question.total)}</div>
        </div>
      ) : feedback ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 22, color: feedback.correct ? '#22c55e' : '#ef4444', fontWeight: 700 }}>
            {feedback.correct ? '✓ Correct!' : `✗ Answer: ${formatVal(feedback.correct_val)}`}
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10 }}>
          <input
            ref={inputRef}
            type="number"
            inputMode="numeric"
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            placeholder="Total value"
            step="0.01"
            style={{
              flex: 1, background: 'rgba(255,255,255,0.08)',
              border: '2px solid rgba(255,215,0,0.3)', borderRadius: 12,
              padding: '14px 16px', fontSize: 22, fontWeight: 700,
              color: 'white', fontFamily: 'Inter, system-ui', outline: 'none',
            }}
            autoFocus
            autoComplete="off"
          />
          <button type="submit" style={{ background: '#FFD700', color: '#1a1a2e', border: 'none', borderRadius: 12, padding: '14px 20px', fontSize: 20, fontWeight: 800, cursor: 'pointer' }}>✓</button>
        </form>
      )}
      <button onClick={feedback ? next : () => { if (!redo) setIdx(i => i + 1) }} style={btnStyle('rgba(255,255,255,0.06)', 'white')}>
        {idx < missed.length - 1 ? 'Next →' : 'Finish'}
      </button>
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function ChipCountingSprint() {
  const [phase, setPhase] = useState('select') // select | sprint | results | review | redo
  const [level, setLevel] = useState(1)
  const [results, setResults] = useState([])
  const [weakAmounts, setWeakAmounts] = useState([])
  const [level3Unlocked] = useState(false) // TODO: wire to stats

  useEffect(() => {
    getWeakSpots(MODULE_ID).then(spots => {
      setWeakAmounts(spots.map(s => s.data?.total).filter(Boolean))
    }).catch(() => {})
  }, [])

  const handleFinish = async (res) => {
    setResults(res)
    const correct = res.filter(r => r.correct).length
    const accuracy = res.length ? (correct / res.length) * 100 : 0
    const avgTime = res.length ? res.reduce((s, r) => s + r.time, 0) / res.length : 0
    const score = correct

    // Record misses
    for (const r of res) {
      if (!r.correct) {
        const key = chipQuestionKey(r.question.stacks)
        await recordMiss(MODULE_ID, key, { total: r.question.total }).catch(() => {})
      }
    }

    await saveSession(MODULE_ID, {
      totalQuestions: res.length, correct, accuracy, avgTime, score, level,
    }).catch(() => {})

    setPhase('results')
  }

  if (phase === 'select') return <LevelSelect level3Unlocked={level3Unlocked} onStart={(l) => { setLevel(l); setPhase('sprint') }} />
  if (phase === 'sprint') return <Sprint level={level} weakAmounts={weakAmounts} onFinish={handleFinish} />
  if (phase === 'results') return (
    <Results
      results={results}
      level={level}
      onReview={() => setPhase('review')}
      onRedo={() => setPhase('redo')}
      onHome={() => setPhase('select')}
    />
  )
  if (phase === 'review') return <ReviewMode missed={results.filter(r => !r.correct)} redo={false} onDone={() => setPhase('results')} />
  if (phase === 'redo') return <ReviewMode missed={results.filter(r => !r.correct)} redo={true} onDone={() => setPhase('results')} />
}
