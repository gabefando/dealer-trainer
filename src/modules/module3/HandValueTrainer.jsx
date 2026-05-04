import { useState, useEffect, useRef, useCallback } from 'react'
import Card from '../../components/Card'
import Timer from '../../components/Timer'
import { useCountdown, useStopwatch } from '../../hooks/useTimer'
import { buildShoe, generateHandQuestion, handValue, isSoft } from '../../utils/cardUtils'
import { saveSession, recordMiss, getWeakSpots } from '../../services/db'

const MODULE_ID = 3
const SPRINT_SECS = 120
const SPEED_TARGET = 4

function btnStyle(bg, color, border) {
  return {
    background: bg, color, border: `1.5px solid ${border || color}`,
    borderRadius: 12, padding: '14px', fontSize: 15,
    fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, system-ui', width: '100%',
  }
}

function cardKey(cards) {
  return cards.map(c => `${c.rank}${c.suit}`).join('-')
}

// ── Level selector ────────────────────────────────────────────────────────────
function LevelSelect({ level3Unlocked, onStart }) {
  const [lvl, setLvl] = useState(1)
  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14, flex: 1, justifyContent: 'center', maxWidth: 400, margin: '0 auto', width: '100%' }}>
      <div style={{ textAlign: 'center', fontSize: 13, color: '#9ca3af' }}>
        2-minute sprint · target &lt;{SPEED_TARGET}s/hand · Type the total hand value
      </div>
      {[1, 2, 3].map(l => (
        <button key={l} onClick={() => setLvl(l)} disabled={l === 3 && !level3Unlocked}
          style={{
            background: lvl === l ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.05)',
            border: `1.5px solid ${lvl === l ? '#FFD700' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: 12, padding: '12px 16px',
            color: l === 3 && !level3Unlocked ? '#555' : 'white',
            textAlign: 'left', cursor: l === 3 && !level3Unlocked ? 'not-allowed' : 'pointer', fontFamily: 'Inter, system-ui',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 15 }}>Level {l} {l === 3 && !level3Unlocked && '🔒'}</div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
            {l === 1 && '2-card hands, all types'}
            {l === 2 && '2–4 card hands, all types'}
            {l === 3 && (level3Unlocked ? 'Adaptive — weighted to your missed hands' : 'Unlock at 50+ attempts')}
          </div>
        </button>
      ))}
      <button onClick={() => onStart(lvl)}
        style={{ background: '#FFD700', color: '#1a1a2e', border: 'none', borderRadius: 12, padding: '16px', fontSize: 17, fontWeight: 800, cursor: 'pointer', marginTop: 4, fontFamily: 'Inter, system-ui' }}>
        Start Sprint
      </button>
    </div>
  )
}

// ── Sprint ─────────────────────────────────────────────────────────────────────
function Sprint({ level, onFinish }) {
  const { timeLeft, running, isExpired, start } = useCountdown(SPRINT_SECS)
  const { startTiming, stopTiming } = useStopwatch()
  const shoeRef = useRef(buildShoe())
  const [question, setQuestion] = useState(null)
  const [answer, setAnswer] = useState('')
  const [results, setResults] = useState([])
  const [started, setStarted] = useState(false)
  const inputRef = useRef(null)

  // Replenish shoe if running low
  const ensureShoe = useCallback(() => {
    if (shoeRef.current.length < 20) shoeRef.current = buildShoe()
  }, [])

  const nextQ = useCallback(() => {
    ensureShoe()
    const maxCards = level === 1 ? 2 : level === 2 ? 4 : 6
    const shoe = shoeRef.current
    // Draw 2 to maxCards cards
    const count = Math.floor(Math.random() * (maxCards - 1)) + 2
    const cards = shoe.splice(0, Math.min(count, shoe.length))
    setQuestion({ cards, total: handValue(cards) })
    setAnswer('')
    startTiming()
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [level, ensureShoe, startTiming])

  useEffect(() => {
    if (isExpired && started) onFinish(results)
  }, [isExpired, started, results, onFinish])

  const handleStart = () => { setStarted(true); start(); nextQ() }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!question || !running) return
    const elapsed = stopTiming()
    const parsed = parseInt(answer)
    const correct = parsed === question.total
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

  const soft = question && isSoft(question.cards)

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '10px 20px 16px', gap: 10, minHeight: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <Timer timeLeft={timeLeft} total={SPRINT_SECS} />
        <div style={{ fontSize: 13, color: '#9ca3af' }}>{results.filter(r => r.correct).length}/{results.length}</div>
      </div>

      {/* Cards — fills remaining space */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          {question?.cards.map((card, i) => (
            <Card key={i} rank={card.rank} suit={card.suit} width={58} height={84} />
          ))}
        </div>
        {soft && (
          <div style={{ fontSize: 13, color: '#f59e0b' }}>Soft hand</div>
        )}
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
            placeholder="Hand total"
            style={{
              flex: 1, background: 'rgba(255,255,255,0.08)',
              border: '2px solid rgba(255,215,0,0.3)', borderRadius: 12,
              padding: '14px 16px', fontSize: 22, fontWeight: 700,
              color: 'white', fontFamily: 'Inter, system-ui', outline: 'none',
            }}
            autoComplete="off"
          />
          <button type="submit"
            style={{ background: '#FFD700', color: '#1a1a2e', border: 'none', borderRadius: 12, padding: '14px 20px', fontSize: 20, fontWeight: 800, cursor: 'pointer', flexShrink: 0 }}>
            ✓
          </button>
        </form>
        <div style={{ fontSize: 12, color: '#555', textAlign: 'center', marginTop: 6 }}>Target: &lt;{SPEED_TARGET}s per hand</div>
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
          <button onClick={onReview} style={btnStyle('#1e4535', '#22c55e', '#22c55e')}>Review Missed ({missed.length})</button>
          <button onClick={onRedo} style={btnStyle('#1a1a2e', '#FFD700', '#FFD700')}>Redo Missed (untimed)</button>
        </>}
        <button onClick={onHome} style={btnStyle('#FFD700', '#1a1a2e', '#FFD700')}>Done</button>
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
      <button onClick={onDone} style={btnStyle('#FFD700', '#1a1a2e', '#FFD700')}>Back</button>
    </div>
  }

  const cur = missed[idx]

  const submit = (e) => {
    e.preventDefault()
    if (!redo) { setIdx(i => i + 1); return }
    const parsed = parseInt(answer)
    setFeedback({ correct: parsed === cur.question.total, val: cur.question.total })
  }

  const next = () => { setFeedback(null); setAnswer(''); setIdx(i => i + 1); setTimeout(() => inputRef.current?.focus(), 50) }

  return (
    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#9ca3af' }}>
        <span>{redo ? 'Redo' : 'Review'} Missed</span>
        <span>{idx + 1}/{missed.length}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', minHeight: 100 }}>
        {cur.question.cards.map((card, i) => <Card key={i} rank={card.rank} suit={card.suit} width={52} height={76} />)}
      </div>
      {!redo ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#9ca3af', fontSize: 13 }}>Your: <span style={{ color: '#ef4444' }}>{cur.userAnswer}</span></div>
          <div style={{ color: '#22c55e', fontSize: 24, fontWeight: 700 }}>Correct: {cur.question.total}</div>
        </div>
      ) : feedback ? (
        <div style={{ textAlign: 'center', fontSize: 22, color: feedback.correct ? '#22c55e' : '#ef4444', fontWeight: 700 }}>
          {feedback.correct ? '✓ Correct!' : `✗ Answer: ${feedback.val}`}
        </div>
      ) : (
        <form onSubmit={submit} style={{ display: 'flex', gap: 10 }}>
          <input ref={inputRef} type="number" inputMode="numeric" value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Hand total"
            style={{ flex: 1, background: 'rgba(255,255,255,0.08)', border: '2px solid rgba(255,215,0,0.3)', borderRadius: 12, padding: '14px 16px', fontSize: 22, fontWeight: 700, color: 'white', fontFamily: 'Inter, system-ui', outline: 'none' }}
            autoFocus autoComplete="off" />
          <button type="submit" style={{ background: '#FFD700', color: '#1a1a2e', border: 'none', borderRadius: 12, padding: '14px 20px', fontSize: 20, fontWeight: 800, cursor: 'pointer' }}>✓</button>
        </form>
      )}
      <button onClick={feedback ? next : (!redo ? () => setIdx(i => i + 1) : undefined)} style={btnStyle('rgba(255,255,255,0.06)', 'white', 'rgba(255,255,255,0.1)')}>
        {idx < missed.length - 1 ? 'Next →' : 'Finish'}
      </button>
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function HandValueTrainer() {
  const [phase, setPhase] = useState('select')
  const [level, setLevel] = useState(1)
  const [results, setResults] = useState([])
  const [level3Unlocked] = useState(false)

  const handleFinish = async (res) => {
    setResults(res)
    const correct = res.filter(r => r.correct).length
    const accuracy = res.length ? (correct / res.length) * 100 : 0
    const avgTime = res.length ? res.reduce((s, r) => s + r.time, 0) / res.length : 0
    for (const r of res) {
      if (!r.correct) await recordMiss(MODULE_ID, cardKey(r.question.cards), { cards: r.question.cards, total: r.question.total }).catch(() => {})
    }
    await saveSession(MODULE_ID, { totalQuestions: res.length, correct, accuracy, avgTime, score: correct, level }).catch(() => {})
    setPhase('results')
  }

  if (phase === 'select') return <LevelSelect level3Unlocked={level3Unlocked} onStart={(l) => { setLevel(l); setPhase('sprint') }} />
  if (phase === 'sprint') return <Sprint level={level} onFinish={handleFinish} />
  if (phase === 'results') return <Results results={results} onReview={() => setPhase('review')} onRedo={() => setPhase('redo')} onHome={() => setPhase('select')} />
  if (phase === 'review') return <ReviewMode missed={results.filter(r => !r.correct)} redo={false} onDone={() => setPhase('results')} />
  if (phase === 'redo') return <ReviewMode missed={results.filter(r => !r.correct)} redo={true} onDone={() => setPhase('results')} />
}
