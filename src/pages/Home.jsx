import { useNavigate } from 'react-router-dom'
import ModuleCard from '../components/ModuleCard'
import { useAllModuleStats } from '../hooks/useModuleStats'

const MODULES = [
  { num: 1, name: 'Chip Counting Sprint' },
  { num: 2, name: 'Payout Calculator Sprint' },
  { num: 3, name: 'Hand Value Trainer' },
  { num: 4, name: 'Side Bet Spotter' },
  { num: 5, name: 'Basic Strategy Flashcards' },
  { num: 6, name: 'Rules Quiz' },
  { num: 7, name: 'Full Deal Simulator' },
]

export default function Home() {
  const navigate = useNavigate()
  const { allStats, allReadiness, loading, module7Unlocked, overallReadiness } = useAllModuleStats()

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#1a1a2e',
      padding: '0 0 32px',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        borderBottom: '1px solid rgba(255,215,0,0.15)',
        padding: '20px 20px 16px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 11, letterSpacing: 3, color: '#FFD700', fontWeight: 600, marginBottom: 4 }}>
          RIVERS CASINO
        </div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: 'white', letterSpacing: -0.5 }}>
          Dealer Trainer
        </h1>
        {!loading && (
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{ fontSize: 13, color: '#9ca3af' }}>
              Overall Readiness
            </div>
            <div style={{
              fontSize: 32,
              fontWeight: 800,
              color: overallReadiness >= 70 ? '#22c55e' : overallReadiness >= 40 ? '#FFD700' : '#ef4444',
            }}>
              {overallReadiness}%
            </div>
            <div style={{
              width: 200,
              height: 6,
              borderRadius: 6,
              background: 'rgba(255,255,255,0.1)',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${overallReadiness}%`,
                height: '100%',
                background: overallReadiness >= 70 ? '#22c55e' : overallReadiness >= 40 ? '#FFD700' : '#ef4444',
                borderRadius: 6,
                transition: 'width 0.4s ease',
              }} />
            </div>
          </div>
        )}
      </div>

      {/* Module Grid */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
        {loading ? (
          <div style={{ color: '#9ca3af', textAlign: 'center', marginTop: 40, fontSize: 14 }}>
            Loading stats…
          </div>
        ) : (
          MODULES.map(({ num, name }) => {
            const stats = allStats[num] || {}
            const readiness = allReadiness[num] || 0
            const locked = num === 7 && !module7Unlocked
            const sessions = stats.lastSessions || []
            const lastScore = stats.personalBest !== undefined
              ? (sessions[0]?.score ?? null)
              : null

            return (
              <ModuleCard
                key={num}
                moduleNum={num}
                name={name}
                readiness={readiness}
                personalBest={stats.personalBest ?? null}
                lastScore={lastScore}
                locked={locked}
                onClick={() => navigate(`/module/${num}`)}
              />
            )
          })
        )}

        {!loading && !module7Unlocked && (
          <div style={{
            background: 'rgba(255,215,0,0.08)',
            border: '1px solid rgba(255,215,0,0.2)',
            borderRadius: 12,
            padding: '12px 16px',
            fontSize: 13,
            color: '#FFD700',
            textAlign: 'center',
            lineHeight: 1.5,
          }}>
            Reach 70% readiness on Modules 1, 2 & 3 to unlock the Full Deal Simulator
          </div>
        )}
      </div>
    </div>
  )
}
