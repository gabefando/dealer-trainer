import { useState, useRef } from 'react'
import Card from '../../components/Card'
import Chip from '../../components/Chip'
import ChipStack from '../../components/ChipStack'
import { CHIP_TYPES, breakIntoChips } from '../../utils/chipUtils'
import { buildShoe, handValue, isSoft } from '../../utils/cardUtils'
import { lookupAction } from '../../utils/strategyTable'
import { calcPayout } from '../../utils/payoutUtils'
import { saveSession } from '../../services/db'

const MODULE_ID = 7

const SUIT_LIST = ['♠','♣','♥','♦']

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }
function randChip() { return CHIP_TYPES[randInt(0, CHIP_TYPES.length - 1)] }

function formatVal(v) {
  if (!v && v !== 0) return '—'
  return v === Math.floor(v) ? `$${v}` : `$${v.toFixed(2)}`
}

function randBet() {
  const options = [5, 10, 15, 25, 50, 75, 100]
  return options[randInt(0, options.length - 1)]
}

function randSideBet() {
  const options = [5, 10, 15, 25]
  return options[randInt(0, options.length - 1)]
}

function generateRound(shoe) {
  const numPlayers = randInt(1, 7)
  const players = []
  for (let i = 0; i < numPlayers; i++) {
    const bet = randBet()
    const hasSideBet = Math.random() < 0.3
    players.push({
      id: i,
      bet,
      sideBet: hasSideBet ? randSideBet() : 0,
      hasSideBet,
      cards: [],
      outcome: null, // 'win' | 'lose' | 'push' | 'bj' | 'bust'
      payout: 0,
    })
  }

  // Deal: left-to-right, player cards then dealer
  for (let pass = 0; pass < 2; pass++) {
    for (const p of players) {
      p.cards.push(shoe.splice(0, 1)[0])
    }
    if (pass === 0) {
      // Dealer first card (face up)
    }
  }
  const dealerCards = [shoe.splice(0, 1)[0], shoe.splice(0, 1)[0]] // up, hole

  return { players, dealerCards }
}

// ── Table layout ──────────────────────────────────────────────────────────────
function DealerArea({ cards, holeRevealed }) {
  const total = holeRevealed ? handValue(cards) : handValue([cards[0]])
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: 2 }}>DEALER</div>
      <div style={{ display: 'flex', gap: 6 }}>
        {cards.map((card, i) => (
          <Card key={i} rank={card.rank} suit={card.suit} faceDown={i === 1 && !holeRevealed} width={48} height={68} />
        ))}
      </div>
      <div style={{ fontSize: 13, color: '#FFD700', fontWeight: 600 }}>
        {holeRevealed ? `Total: ${total}` : `Shows: ${handValue([cards[0]])}`}
      </div>
    </div>
  )
}

function PlayerSpot({ player, active, chips }) {
  const total = handValue(player.cards)
  const bust = total > 21
  const bj = player.cards.length === 2 && total === 21

  return (
    <div style={{
      background: active ? 'rgba(255,215,0,0.1)' : 'rgba(255,255,255,0.04)',
      border: `2px solid ${active ? '#FFD700' : 'rgba(255,255,255,0.1)'}`,
      borderRadius: 14, padding: '10px 12px',
      display: 'flex', flexDirection: 'column', gap: 6,
      minWidth: 0,
    }}>
      <div style={{ fontSize: 11, color: '#9ca3af' }}>P{player.id + 1}</div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
        {player.cards.map((card, i) => (
          <Card key={i} rank={card.rank} suit={card.suit} width={36} height={52} />
        ))}
      </div>
      {player.cards.length > 0 && (
        <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 700,
          color: bust ? '#ef4444' : bj ? '#FFD700' : 'white' }}>
          {bust ? 'BUST' : bj ? 'BJ' : total}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 4, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Chip chip={chips.main} size={24} />
          <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 3 }}>{formatVal(player.bet)}</span>
        </div>
        {player.hasSideBet && (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Chip chip={chips.side} size={18} />
            <span style={{ fontSize: 10, color: '#FF69B4', marginLeft: 2 }}>LL</span>
          </div>
        )}
      </div>
      {player.outcome && (
        <div style={{
          textAlign: 'center', fontSize: 11, fontWeight: 700,
          color: player.outcome === 'win' || player.outcome === 'bj' ? '#22c55e'
               : player.outcome === 'push' ? '#FFD700' : '#ef4444',
        }}>
          {player.outcome === 'win' ? `+${formatVal(player.payout)}` :
           player.outcome === 'bj' ? `BJ +${formatVal(player.payout)}` :
           player.outcome === 'push' ? 'PUSH' : 'LOSE'}
        </div>
      )}
    </div>
  )
}

// ── Phase: Insurance ──────────────────────────────────────────────────────────
function InsurancePhase({ players, onDone }) {
  const [insuranceChoices, setInsuranceChoices] = useState({})
  const [evenMoneyChoices, setEvenMoneyChoices] = useState({})

  const bjPlayers = players.filter(p => handValue(p.cards) === 21 && p.cards.length === 2)
  const others = players.filter(p => !(handValue(p.cards) === 21 && p.cards.length === 2))

  return (
    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontSize: 14, color: '#FFD700', fontWeight: 700, textAlign: 'center' }}>
        Dealer shows Ace — Insurance / Even Money?
      </div>

      {bjPlayers.map(p => (
        <div key={p.id} style={{ background: 'rgba(255,215,0,0.08)', borderRadius: 12, padding: '12px 14px' }}>
          <div style={{ fontSize: 13, color: '#FFD700', fontWeight: 600, marginBottom: 8 }}>
            P{p.id + 1} has Blackjack — Even Money ({formatVal(p.bet)} → {formatVal(p.bet)})?
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {['Yes', 'No'].map(choice => (
              <button key={choice} onClick={() => setEvenMoneyChoices(prev => ({ ...prev, [p.id]: choice }))}
                style={{
                  background: evenMoneyChoices[p.id] === choice ? 'rgba(255,215,0,0.2)' : 'rgba(255,255,255,0.05)',
                  border: `1.5px solid ${evenMoneyChoices[p.id] === choice ? '#FFD700' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: 8, padding: '8px 16px', color: 'white',
                  fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, system-ui', fontSize: 14,
                }}>
                {choice}
              </button>
            ))}
          </div>
        </div>
      ))}

      {others.map(p => (
        <div key={p.id} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '12px 14px' }}>
          <div style={{ fontSize: 13, color: 'white', fontWeight: 600, marginBottom: 8 }}>
            P{p.id + 1} — Insurance? (up to {formatVal(p.bet / 2)})
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {['Yes', 'No'].map(choice => (
              <button key={choice} onClick={() => setInsuranceChoices(prev => ({ ...prev, [p.id]: choice }))}
                style={{
                  background: insuranceChoices[p.id] === choice ? 'rgba(255,215,0,0.2)' : 'rgba(255,255,255,0.05)',
                  border: `1.5px solid ${insuranceChoices[p.id] === choice ? '#FFD700' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: 8, padding: '8px 16px', color: 'white',
                  fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, system-ui', fontSize: 14,
                }}>
                {choice}
              </button>
            ))}
          </div>
        </div>
      ))}

      <button onClick={() => onDone({ insuranceChoices, evenMoneyChoices })}
        style={{ background: '#FFD700', color: '#1a1a2e', border: 'none', borderRadius: 12, padding: '14px', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'Inter, system-ui' }}>
        Continue →
      </button>
    </div>
  )
}

// ── Phase: Player Actions ─────────────────────────────────────────────────────
function PlayerActionPhase({ player, dealerUpcard, shoe, onAction }) {
  const correctAction = lookupAction(player.cards, dealerUpcard.rank)
  const [selected, setSelected] = useState(null)
  const [feedback, setFeedback] = useState(null)

  const actions = ['H', 'S', 'D', 'SP']
  const actionColors = { H: '#3b82f6', S: '#ef4444', D: '#8b5cf6', SP: '#f59e0b' }
  const actionLabels = { H: 'Hit', S: 'Stand', D: 'Double', SP: 'Split' }

  const handleSelect = (a) => {
    if (feedback) return
    setSelected(a)
    const correct = a === correctAction
    setFeedback({ correct, correctAction })
    if (!correct) return // wait for user to see and confirm
  }

  const confirm = () => {
    onAction(selected || correctAction, feedback?.correct ?? false)
  }

  const total = handValue(player.cards)
  const soft = isSoft(player.cards)

  return (
    <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 13, color: '#FFD700', fontWeight: 700 }}>
        P{player.id + 1} — {soft ? 'Soft ' : 'Hard '}{total}
        <span style={{ color: '#9ca3af', fontWeight: 400, marginLeft: 8, fontSize: 12 }}>vs dealer {dealerUpcard.rank}</span>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {player.cards.map((card, i) => <Card key={i} rank={card.rank} suit={card.suit} width={48} height={68} />)}
        <Card rank={dealerUpcard.rank} suit={dealerUpcard.suit} width={48} height={68} />
      </div>

      {!feedback ? (
        <>
          <div style={{ fontSize: 13, color: '#9ca3af' }}>Select the correct action:</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {actions.map(a => (
              <button key={a} onClick={() => handleSelect(a)}
                style={{
                  background: actionColors[a] + '22', border: `2px solid ${actionColors[a]}`,
                  borderRadius: 12, padding: '14px', color: actionColors[a], fontWeight: 800,
                  fontSize: 17, cursor: 'pointer', fontFamily: 'Inter, system-ui',
                }}>
                {a} <span style={{ fontSize: 11, fontWeight: 400, display: 'block', marginTop: 2 }}>{actionLabels[a]}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <div style={{ textAlign: 'center', fontSize: 18, fontWeight: 700, color: feedback.correct ? '#22c55e' : '#ef4444' }}>
            {feedback.correct ? `✓ Correct — ${actionLabels[correctAction]}` : `✗ Should be: ${correctAction} (${actionLabels[correctAction]})`}
          </div>
          <button onClick={confirm}
            style={{ background: '#FFD700', color: '#1a1a2e', border: 'none', borderRadius: 12, padding: '14px', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'Inter, system-ui' }}>
            Next →
          </button>
        </>
      )}
    </div>
  )
}

// ── Phase: Payout input ───────────────────────────────────────────────────────
function PayoutPhase({ players, dealerTotal, dealerHasBJ, onDone }) {
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState({})
  const [allDone, setAllDone] = useState(false)

  const getPlayerOutcome = (player) => {
    const playerTotal = handValue(player.cards)
    const playerBJ = playerTotal === 21 && player.cards.length === 2
    const playerBust = playerTotal > 21

    if (playerBust) return { outcome: 'lose', payout: 0 }
    if (dealerHasBJ && playerBJ) return { outcome: 'push', payout: player.bet }
    if (dealerHasBJ) return { outcome: 'lose', payout: 0 }
    if (playerBJ) return { outcome: 'bj', payout: calcPayout(player.bet, 'blackjack') + player.bet }
    if (playerTotal > dealerTotal || dealerTotal > 21) return { outcome: 'win', payout: player.bet + player.bet }
    if (playerTotal === dealerTotal) return { outcome: 'push', payout: player.bet }
    return { outcome: 'lose', payout: 0 }
  }

  const handleSubmit = (playerId) => {
    const player = players.find(p => p.id === playerId)
    const { outcome, payout } = getPlayerOutcome(player)
    const userInput = parseFloat(answers[playerId] || '0')
    const correct = Math.abs(userInput - payout) < 0.005
    setSubmitted(prev => ({ ...prev, [playerId]: { correct, payout, outcome } }))
    if (Object.keys(submitted).length + 1 >= players.length) setAllDone(true)
  }

  const results = Object.entries(submitted).map(([id, v]) => ({ id: parseInt(id), ...v }))

  return (
    <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
      <div style={{ fontSize: 14, color: '#FFD700', fontWeight: 700 }}>
        Dealer: {dealerTotal > 21 ? 'BUST' : dealerTotal} {dealerHasBJ ? '(BJ)' : ''}
      </div>
      <div style={{ fontSize: 13, color: '#9ca3af' }}>Enter the total to pay each player (bet + winnings, or 0 for loss):</div>

      {players.map(player => {
        const s = submitted[player.id]
        const playerTotal = handValue(player.cards)
        const bj = playerTotal === 21 && player.cards.length === 2
        const bust = playerTotal > 21
        return (
          <div key={player.id} style={{
            background: s ? (s.correct ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)') : 'rgba(255,255,255,0.05)',
            border: `1px solid ${s ? (s.correct ? '#22c55e' : '#ef4444') : 'rgba(255,255,255,0.1)'}`,
            borderRadius: 12, padding: '12px 14px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                P{player.id + 1}: {bust ? 'BUST' : bj ? 'BJ' : playerTotal} · Bet {formatVal(player.bet)}
              </div>
              {s && <div style={{ fontSize: 12, color: s.correct ? '#22c55e' : '#ef4444', fontWeight: 700 }}>
                {s.correct ? '✓' : `✗ ${formatVal(s.payout)}`}
              </div>}
            </div>
            {!s && (
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="number" inputMode="numeric" value={answers[player.id] || ''}
                  onChange={e => setAnswers(prev => ({ ...prev, [player.id]: e.target.value }))}
                  placeholder="Payout" step="0.5"
                  style={{
                    flex: 1, background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,215,0,0.3)',
                    borderRadius: 10, padding: '10px 12px', fontSize: 16, fontWeight: 700, color: 'white',
                    fontFamily: 'Inter, system-ui', outline: 'none',
                  }}
                  autoComplete="off"
                />
                <button onClick={() => handleSubmit(player.id)}
                  style={{ background: '#FFD700', color: '#1a1a2e', border: 'none', borderRadius: 10, padding: '10px 16px', fontWeight: 800, cursor: 'pointer', fontSize: 16 }}>✓</button>
              </div>
            )}
          </div>
        )
      })}

      {Object.keys(submitted).length >= players.length && (
        <button onClick={() => onDone(results)}
          style={{ background: '#FFD700', color: '#1a1a2e', border: 'none', borderRadius: 12, padding: '14px', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'Inter, system-ui', marginTop: 8 }}>
          Round Summary →
        </button>
      )}
    </div>
  )
}

// ── Round Summary ─────────────────────────────────────────────────────────────
function RoundSummary({ strategyResults, payoutResults, onNext }) {
  const totalStrat = strategyResults.length
  const correctStrat = strategyResults.filter(r => r.correct).length
  const totalPayout = payoutResults.length
  const correctPayout = payoutResults.filter(r => r.correct).length

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 400, margin: '0 auto', width: '100%' }}>
      <h3 style={{ margin: 0, textAlign: 'center', color: 'white' }}>Round Complete</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[
          ['Strategy', `${correctStrat}/${totalStrat}`],
          ['Payouts', `${correctPayout}/${totalPayout}`],
        ].map(([l, v]) => (
          <div key={l} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: '12px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>{l}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#FFD700' }}>{v}</div>
          </div>
        ))}
      </div>
      <button onClick={onNext}
        style={{ background: '#FFD700', color: '#1a1a2e', border: 'none', borderRadius: 12, padding: '14px', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'Inter, system-ui' }}>
        Deal Next Round →
      </button>
    </div>
  )
}

// ── Main Simulator ─────────────────────────────────────────────────────────────
export default function DealSimulator() {
  const shoeRef = useRef(buildShoe())
  const [phase, setPhase] = useState('idle') // idle | insurance | actions | dealer | payouts | summary
  const [round, setRound] = useState(null)
  const [playerIdx, setPlayerIdx] = useState(0)
  const [strategyResults, setStrategyResults] = useState([])
  const [payoutResults, setPayoutResults] = useState([])
  const [sessionResults, setSessionResults] = useState([])
  const [roundCount, setRoundCount] = useState(0)
  const [holeRevealed, setHoleRevealed] = useState(false)
  const [dealerFinal, setDealerFinal] = useState(null)

  const ensureShoe = () => {
    if (shoeRef.current.length < 60) shoeRef.current = buildShoe()
  }

  const startRound = () => {
    ensureShoe()
    const r = generateRound(shoeRef.current)
    setRound(r)
    setPlayerIdx(0)
    setStrategyResults([])
    setPayoutResults([])
    setHoleRevealed(false)
    setDealerFinal(null)

    const dealerUp = r.dealerCards[0]
    if (dealerUp.rank === 'A') {
      setPhase('insurance')
    } else {
      setPhase('actions')
    }
  }

  const handleInsuranceDone = () => {
    setPhase('actions')
  }

  const handlePlayerAction = (action, correct) => {
    setStrategyResults(prev => [...prev, { playerId: round.players[playerIdx].id, correct }])
    const nextIdx = playerIdx + 1
    if (nextIdx >= round.players.length) {
      // Dealer's turn
      revealAndDraw()
    } else {
      setPlayerIdx(nextIdx)
    }
  }

  const revealAndDraw = () => {
    setHoleRevealed(true)
    // Dealer draws to 17
    const cards = [...round.dealerCards]
    while (handValue(cards) < 17) {
      ensureShoe()
      cards.push(shoeRef.current.splice(0, 1)[0])
    }
    setRound(prev => ({ ...prev, dealerCards: cards }))
    setDealerFinal(handValue(cards))
    setPhase('payouts')
  }

  const handlePayoutsDone = (results) => {
    setPayoutResults(results)
    const roundSummary = {
      strategyCorrect: strategyResults.filter(r => r.correct).length,
      strategyTotal: strategyResults.length,
      payoutCorrect: results.filter(r => r.correct).length,
      payoutTotal: results.length,
    }
    setSessionResults(prev => [...prev, roundSummary])
    setRoundCount(c => c + 1)
    setPhase('summary')
  }

  const handleEndSession = async () => {
    const totalStrat = sessionResults.reduce((s, r) => s + r.strategyTotal, 0)
    const correctStrat = sessionResults.reduce((s, r) => s + r.strategyCorrect, 0)
    const totalPayout = sessionResults.reduce((s, r) => s + r.payoutTotal, 0)
    const correctPayout = sessionResults.reduce((s, r) => s + r.payoutCorrect, 0)
    const totalQ = totalStrat + totalPayout
    const totalCorrect = correctStrat + correctPayout
    const accuracy = totalQ > 0 ? (totalCorrect / totalQ) * 100 : 0
    await saveSession(MODULE_ID, { totalQuestions: totalQ, correct: totalCorrect, accuracy, avgTime: 0, score: totalCorrect }).catch(() => {})
    setPhase('idle')
    setSessionResults([])
    setRoundCount(0)
  }

  const dealerUp = round?.dealerCards[0]

  if (phase === 'idle') {
    const totalAccuracy = sessionResults.length > 0
      ? Math.round(sessionResults.reduce((s, r) => s + (r.strategyCorrect + r.payoutCorrect), 0) /
          sessionResults.reduce((s, r) => s + (r.strategyTotal + r.payoutTotal), 0) * 100)
      : null

    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.5, marginBottom: 8 }}>
            Full table simulation — confirm strategy, then calculate payouts.
            {roundCount > 0 && ` Round ${roundCount} complete.`}
          </div>
          {totalAccuracy !== null && (
            <div style={{ fontSize: 32, fontWeight: 800, color: '#FFD700' }}>{totalAccuracy}% accuracy</div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button onClick={startRound}
            style={{ background: '#FFD700', color: '#1a1a2e', border: 'none', borderRadius: 14, padding: '18px 36px', fontSize: 18, fontWeight: 800, cursor: 'pointer', fontFamily: 'Inter, system-ui' }}>
            {roundCount === 0 ? 'Deal First Round' : 'Deal Another Round'}
          </button>
          {roundCount > 0 && (
            <button onClick={handleEndSession}
              style={{ background: 'rgba(255,255,255,0.07)', color: 'white', border: '1.5px solid rgba(255,255,255,0.2)', borderRadius: 14, padding: '18px 24px', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, system-ui' }}>
              End Session
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      {/* Table mini-view */}
      <div style={{ background: '#35654d', padding: '12px 16px', borderBottom: '2px solid #1e4535' }}>
        <DealerArea cards={round.dealerCards} holeRevealed={holeRevealed} />
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingTop: 10 }}>
          {round.players.map((player, i) => (
            <div key={player.id} style={{ minWidth: 100, flex: '0 0 auto' }}>
              <PlayerSpot
                player={player}
                active={phase === 'actions' && i === playerIdx}
                chips={{ main: CHIP_TYPES.find(c => c.value <= player.bet) || CHIP_TYPES[2], side: CHIP_TYPES[3] }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Phase content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {phase === 'insurance' && (
          <InsurancePhase players={round.players} onDone={handleInsuranceDone} />
        )}
        {phase === 'actions' && round.players[playerIdx] && (
          <PlayerActionPhase
            key={playerIdx}
            player={round.players[playerIdx]}
            dealerUpcard={dealerUp}
            shoe={shoeRef.current}
            onAction={handlePlayerAction}
          />
        )}
        {phase === 'payouts' && (
          <PayoutPhase
            players={round.players}
            dealerTotal={dealerFinal || handValue(round.dealerCards)}
            dealerHasBJ={round.dealerCards.length === 2 && handValue(round.dealerCards) === 21}
            onDone={handlePayoutsDone}
          />
        )}
        {phase === 'summary' && (
          <RoundSummary
            strategyResults={strategyResults}
            payoutResults={payoutResults}
            onNext={() => setPhase('idle')}
          />
        )}
      </div>
    </div>
  )
}
