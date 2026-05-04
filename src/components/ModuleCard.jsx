import ProgressBar from './ProgressBar'

const READINESS_COLOR = (r) => {
  if (r >= 80) return '#22c55e'
  if (r >= 50) return '#FFD700'
  return '#ef4444'
}

export default function ModuleCard({ moduleNum, name, readiness, personalBest, lastScore, locked, onClick }) {
  return (
    <button
      onClick={locked ? undefined : onClick}
      disabled={locked}
      style={{
        background: locked ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.07)',
        border: `1px solid ${locked ? 'rgba(255,255,255,0.08)' : 'rgba(255,215,0,0.2)'}`,
        borderRadius: 16,
        padding: '16px',
        textAlign: 'left',
        cursor: locked ? 'not-allowed' : 'pointer',
        opacity: locked ? 0.5 : 1,
        transition: 'transform 0.15s, box-shadow 0.15s',
        width: '100%',
        color: 'white',
        fontFamily: 'Inter, system-ui',
      }}
      onMouseEnter={e => { if (!locked) e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = '' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>MODULE {moduleNum}</div>
          <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.3 }}>{name}</div>
        </div>
        {locked ? (
          <span style={{ fontSize: 20 }}>🔒</span>
        ) : (
          <div style={{
            fontSize: 18,
            fontWeight: 700,
            color: READINESS_COLOR(readiness),
          }}>
            {readiness}%
          </div>
        )}
      </div>

      {!locked && (
        <>
          <ProgressBar value={readiness} color={READINESS_COLOR(readiness)} height={6} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 12, color: '#9ca3af' }}>
            <span>Best: <span style={{ color: '#FFD700' }}>{personalBest ?? '—'}</span></span>
            <span>Last: <span style={{ color: 'white' }}>{lastScore ?? '—'}</span></span>
          </div>
        </>
      )}
    </button>
  )
}
