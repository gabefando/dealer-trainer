import { useState, useEffect } from 'react'
import { getRandomQuestions } from '../../utils/rulesQuestions'
import { saveSession, recordMiss } from '../../services/db'

const MODULE_ID = 6
const QUESTIONS_PER_SESSION = 20

function btnStyle(bg, color, border) {
  return {
    background: bg, color, border: `1.5px solid ${border || color}`,
    borderRadius: 12, padding: '14px 16px', fontSize: 15,
    fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, system-ui',
    textAlign: 'left', width: '100%', lineHeight: 1.3,
  }
}

// ── Setup ─────────────────────────────────────────────────────────────────────
function Setup({ onStart }) {
  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, flex: 1, justifyContent: 'center', maxWidth: 440, margin: '0 auto', width: '100%' }}>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ color: 'white', margin: '0 0 8px' }}>Rules Quiz</h2>
        <p style={{ color: '#9ca3af', fontSize: 14, lineHeight: 1.5 }}>
          {QUESTIONS_PER_SESSION} multiple-choice questions drawn from the full Rivers Casino rules.
          Covers payouts, splits, doubles, surrender, insurance, Lucky Ladies, and more.
        </p>
      </div>
      <button onClick={onStart}
        style={{ background: '#FFD700', color: '#1a1a2e', border: 'none', borderRadius: 12, padding: '16px', fontSize: 17, fontWeight: 800, cursor: 'pointer', fontFamily: 'Inter, system-ui' }}>
        Start Quiz
      </button>
    </div>
  )
}

// ── Quiz ──────────────────────────────────────────────────────────────────────
function Quiz({ onFinish }) {
  const [questions] = useState(() => getRandomQuestions(QUESTIONS_PER_SESSION))
  const [idx, setIdx] = useState(0)
  const [results, setResults] = useState([])
  const [chosen, setChosen] = useState(null)

  const q = questions[idx]

  const handleChoice = (choice) => {
    if (chosen !== null) return
    setChosen(choice)
    const correct = choice === q.answer
    setResults(prev => [...prev, { q, chosen: choice, correct }])
  }

  const next = () => {
    if (idx + 1 >= questions.length) {
      onFinish(results)
      return
    }
    setChosen(null)
    setIdx(i => i + 1)
  }

  const isCorrect = chosen !== null && chosen === q.answer
  const isWrong = chosen !== null && chosen !== q.answer

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px 20px', gap: 16 }}>
      {/* Progress */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: '#9ca3af' }}>
        <span>Question {idx + 1} of {questions.length}</span>
        <span>{results.filter(r => r.correct).length} correct</span>
      </div>
      <div style={{ height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
        <div style={{ width: `${(idx / questions.length) * 100}%`, height: '100%', background: '#FFD700', borderRadius: 4, transition: 'width 0.3s' }} />
      </div>

      {/* Question */}
      <div style={{
        background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: '18px 16px',
        fontSize: 16, fontWeight: 600, color: 'white', lineHeight: 1.5,
      }}>
        {q.q}
      </div>

      {/* Choices */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
        {q.choices.map((choice) => {
          let bg = 'rgba(255,255,255,0.05)'
          let color = 'white'
          let border = 'rgba(255,255,255,0.1)'

          if (chosen !== null) {
            if (choice === q.answer) { bg = 'rgba(34,197,94,0.15)'; border = '#22c55e'; color = '#22c55e' }
            else if (choice === chosen) { bg = 'rgba(239,68,68,0.15)'; border = '#ef4444'; color = '#ef4444' }
          }

          return (
            <button key={choice} onClick={() => handleChoice(choice)}
              style={btnStyle(bg, color, border)}>
              {chosen !== null && choice === q.answer && '✓ '}
              {chosen !== null && choice === chosen && choice !== q.answer && '✗ '}
              {choice}
            </button>
          )
        })}
      </div>

      {chosen !== null && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ textAlign: 'center', fontSize: 15, fontWeight: 700, color: isCorrect ? '#22c55e' : '#ef4444' }}>
            {isCorrect ? '✓ Correct!' : `✗ Correct answer: ${q.answer}`}
          </div>
          <button onClick={next}
            style={{ background: '#FFD700', color: '#1a1a2e', border: 'none', borderRadius: 12, padding: '14px', fontSize: 16, fontWeight: 800, cursor: 'pointer', fontFamily: 'Inter, system-ui' }}>
            {idx + 1 >= questions.length ? 'See Results' : 'Next Question →'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Results ───────────────────────────────────────────────────────────────────
function Results({ results, onHome, onRetry }) {
  const correct = results.filter(r => r.correct).length
  const accuracy = results.length ? Math.round((correct / results.length) * 100) : 0
  const missed = results.filter(r => !r.correct)

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 440, margin: '0 auto', width: '100%' }}>
      <h2 style={{ margin: 0, textAlign: 'center', color: 'white', fontSize: 22 }}>Quiz Complete!</h2>
      <div style={{ textAlign: 'center', fontSize: 48, fontWeight: 800, color: accuracy >= 80 ? '#22c55e' : accuracy >= 60 ? '#FFD700' : '#ef4444' }}>
        {accuracy}%
      </div>
      <div style={{ textAlign: 'center', fontSize: 14, color: '#9ca3af' }}>{correct}/{results.length} correct</div>

      {/* Missed questions */}
      {missed.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 13, color: '#FFD700', fontWeight: 600 }}>Review missed ({missed.length}):</div>
          {missed.map((r, i) => (
            <div key={i} style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '12px 14px' }}>
              <div style={{ fontSize: 13, color: 'white', fontWeight: 600, lineHeight: 1.4, marginBottom: 4 }}>{r.q.q}</div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>Your answer: <span style={{ color: '#ef4444' }}>{r.chosen}</span></div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>Correct: <span style={{ color: '#22c55e' }}>{r.q.answer}</span></div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onRetry}
          style={{ background: 'rgba(255,255,255,0.07)', color: 'white', border: '1.5px solid rgba(255,255,255,0.2)', borderRadius: 12, padding: '14px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, system-ui', flex: 1 }}>
          Retry
        </button>
        <button onClick={onHome}
          style={{ background: '#FFD700', color: '#1a1a2e', border: 'none', borderRadius: 12, padding: '14px', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'Inter, system-ui', flex: 1 }}>
          Done
        </button>
      </div>
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function RulesQuiz() {
  const [phase, setPhase] = useState('setup')
  const [results, setResults] = useState([])

  const handleFinish = async (res) => {
    setResults(res)
    const correct = res.filter(r => r.correct).length
    const accuracy = res.length ? (correct / res.length) * 100 : 0
    for (const r of res) {
      if (!r.correct) await recordMiss(MODULE_ID, r.q.id, { q: r.q.q, answer: r.q.answer }).catch(() => {})
    }
    await saveSession(MODULE_ID, { totalQuestions: res.length, correct, accuracy, avgTime: 0, score: correct }).catch(() => {})
    setPhase('results')
  }

  if (phase === 'setup') return <Setup onStart={() => setPhase('quiz')} />
  if (phase === 'quiz') return <Quiz key={phase} onFinish={handleFinish} />
  if (phase === 'results') return <Results results={results} onHome={() => setPhase('setup')} onRetry={() => setPhase('quiz')} />
}
