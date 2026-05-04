import { useState, useEffect } from 'react'
import Card from '../../components/Card'
import { generateStrategyQuestion, lookupAction } from '../../utils/strategyTable'
import { saveSession, recordMiss, getWeakSpots } from '../../services/db'

const MODULE_ID = 5
const ACTIONS = ['H', 'S', 'D', 'SP']
const ACTION_LABELS = { H: 'Hit', S: 'Stand', D: 'Double', SP: 'Split' }
const ACTION_COLORS = { H: '#3b82f6', S: '#ef4444', D: '#8b5cf6', SP: '#f59e0b' }

const CATEGORY_LABELS = { hard: 'Hard Totals', soft: 'Soft Totals', pair: 'Pairs' }

function btnStyle(bg, color) {
  return { background: bg, color, border: 'none', borderRadius: 12, padding: '14px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, system-ui' }
}

// ── Setup ─────────────────────────────────────────────────────────────────────
function Setup({ onStart }) {
  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, flex: 1, justifyContent: 'center', maxWidth: 400, margin: '0 auto', width: '100%' }}>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ color: 'white', margin: '0 0 8px' }}>Basic Strategy Flashcards</h2>
        <p style={{ color: '#9ca3af', fontSize: 14, lineHeight: 1.5 }}>
          See dealer upcard + player hand. Select the correct action: Hit · Stand · Double · Split.
          Adaptive repetition — missed combos appear more often.
        </p>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        {ACTIONS.map(a => (
          <div key={a} style={{ background: ACTION_COLORS[a] + '22', border: `1px solid ${ACTION_COLORS[a]}`, borderRadius: 8, padding: '6px 14px', color: ACTION_COLORS[a], fontWeight: 700, fontSize: 14 }}>
            {ACTION_LABELS[a]}
          </div>
        ))}
      </div>
      <button onClick={onStart} style={{ background: '#FFD700', color: '#1a1a2e', border: 'none', borderRadius: 12, padding: '16px', fontSize: 17, fontWeight: 800, cursor: 'pointer', fontFamily: 'Inter, system-ui' }}>
        Start Flashcards
      </button>
    </div>
  )
}

// ── Flashcard session ─────────────────────────────────────────────────────────
const SESSION_SIZE = 20

function Session({ weakSpots, onFinish }) {
  const [idx, setIdx] = useState(0)
  const [results, setResults] = useState([])
  const [feedback, setFeedback] = useState(null) // null | { correct, correctAction }

  const getQuestion = (i) => {
    // 80% chance to use weak spot if available
    if (weakSpots.length > 0 && Math.random() < 0.8) {
      const ws = weakSpots[Math.floor(Math.random() * weakSpots.length)]
      if (ws.data?.playerCards && ws.data?.dealerCard) {
        const q = {
          playerCards: ws.data.playerCards,
          dealerCard: ws.data.dealerCard,
          correctAction: lookupAction(ws.data.playerCards, ws.data.dealerCard.rank),
          key: ws.id,
          category: ws.data.category || 'hard',
        }
        return q
      }
    }
    return generateStrategyQuestion([])
  }

  const [question, setQuestion] = useState(() => getQuestion(0))

  const handleAnswer = (action) => {
    if (feedback) return
    const correct = action === question.correctAction
    setFeedback({ correct, correctAction: question.correctAction, chosen: action })
    setResults(prev => [...prev, { question, userAction: action, correct }])
  }

  const next = () => {
    if (idx + 1 >= SESSION_SIZE) {
      onFinish(results)
      return
    }
    setFeedback(null)
    setIdx(i => i + 1)
    setQuestion(getQuestion(idx + 1))
  }

  const { playerCards, dealerCard, correctAction, category } = question

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '12px 20px', gap: 16 }}>
      {/* Progress */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#9ca3af' }}>
        <span>{CATEGORY_LABELS[category]}</span>
        <span>{idx + 1}/{SESSION_SIZE} · {results.filter(r => r.correct).length} correct</span>
      </div>

      {/* Dealer upcard */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 6 }}>Dealer shows</div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Card rank={dealerCard.rank} suit={dealerCard.suit} width={58} height={84} />
        </div>
      </div>

      {/* Player hand */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 6 }}>Your hand</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
          {playerCards.map((card, i) => (
            <Card key={i} rank={card.rank} suit={card.suit} width={58} height={84} />
          ))}
        </div>
      </div>

      {/* Action buttons */}
      {!feedback ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {ACTIONS.map(a => (
            <button key={a} onClick={() => handleAnswer(a)}
              style={{
                background: ACTION_COLORS[a] + '22',
                border: `2px solid ${ACTION_COLORS[a]}`,
                borderRadius: 14, padding: '16px',
                color: ACTION_COLORS[a], fontWeight: 800, fontSize: 18,
                cursor: 'pointer', fontFamily: 'Inter, system-ui',
              }}>
              {a} <span style={{ fontSize: 12, fontWeight: 400, display: 'block', marginTop: 2 }}>{ACTION_LABELS[a]}</span>
            </button>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{
            textAlign: 'center', fontSize: 22, fontWeight: 800,
            color: feedback.correct ? '#22c55e' : '#ef4444',
          }}>
            {feedback.correct ? '✓ Correct!' : `✗ Answer: ${feedback.correctAction}`}
          </div>
          {!feedback.correct && (
            <div style={{ textAlign: 'center', fontSize: 14, color: '#9ca3af' }}>
              {ACTION_LABELS[feedback.correctAction]} is correct for this situation
            </div>
          )}
          <button onClick={next}
            style={{ background: '#FFD700', color: '#1a1a2e', border: 'none', borderRadius: 12, padding: '14px', fontSize: 16, fontWeight: 800, cursor: 'pointer', fontFamily: 'Inter, system-ui' }}>
            {idx + 1 >= SESSION_SIZE ? 'See Results' : 'Next →'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Results ───────────────────────────────────────────────────────────────────
function Results({ results, onHome, onAgain }) {
  const correct = results.filter(r => r.correct).length
  const accuracy = results.length ? Math.round((correct / results.length) * 100) : 0

  const byCategory = { hard: { correct: 0, total: 0 }, soft: { correct: 0, total: 0 }, pair: { correct: 0, total: 0 } }
  for (const r of results) {
    const cat = r.question.category
    if (byCategory[cat]) {
      byCategory[cat].total++
      if (r.correct) byCategory[cat].correct++
    }
  }

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 400, margin: '0 auto', width: '100%' }}>
      <h2 style={{ margin: 0, textAlign: 'center', color: 'white', fontSize: 22 }}>Session Complete!</h2>
      <div style={{ textAlign: 'center', fontSize: 42, fontWeight: 800, color: accuracy >= 80 ? '#22c55e' : accuracy >= 60 ? '#FFD700' : '#ef4444' }}>
        {accuracy}%
      </div>
      <div style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center' }}>{correct}/{results.length} correct</div>

      {/* Category breakdown */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {Object.entries(byCategory).filter(([, v]) => v.total > 0).map(([cat, { correct: c, total: t }]) => (
          <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '10px 14px' }}>
            <span style={{ fontSize: 14, color: '#9ca3af' }}>{CATEGORY_LABELS[cat]}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: t > 0 && c / t >= 0.8 ? '#22c55e' : '#FFD700' }}>{Math.round((c / t) * 100)}%</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onAgain} style={btnStyle('rgba(255,255,255,0.07)', 'white')}>Play Again</button>
        <button onClick={onHome} style={btnStyle('#FFD700', '#1a1a2e')}>Done</button>
      </div>
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function BasicStrategy() {
  const [phase, setPhase] = useState('setup')
  const [results, setResults] = useState([])
  const [weakSpots, setWeakSpots] = useState([])

  useEffect(() => {
    getWeakSpots(MODULE_ID).then(setWeakSpots).catch(() => {})
  }, [])

  const handleFinish = async (res) => {
    setResults(res)
    const correct = res.filter(r => r.correct).length
    const accuracy = res.length ? (correct / res.length) * 100 : 0
    for (const r of res) {
      if (!r.correct) {
        await recordMiss(MODULE_ID, r.question.key, {
          playerCards: r.question.playerCards,
          dealerCard: r.question.dealerCard,
          category: r.question.category,
        }).catch(() => {})
      }
    }
    await saveSession(MODULE_ID, { totalQuestions: res.length, correct, accuracy, avgTime: 0, score: correct }).catch(() => {})
    setPhase('results')
  }

  if (phase === 'setup') return <Setup onStart={() => setPhase('session')} />
  if (phase === 'session') return <Session key={phase} weakSpots={weakSpots} onFinish={handleFinish} />
  if (phase === 'results') return <Results results={results} onHome={() => setPhase('setup')} onAgain={() => setPhase('session')} />
}
