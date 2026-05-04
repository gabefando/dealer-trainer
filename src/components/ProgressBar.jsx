export default function ProgressBar({ value, max = 100, color = '#FFD700', height = 8, label = null }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div style={{ width: '100%' }}>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>
          <span>{label}</span>
          <span>{Math.round(pct)}%</span>
        </div>
      )}
      <div style={{
        width: '100%',
        height,
        borderRadius: height,
        background: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          background: color,
          borderRadius: height,
          transition: 'width 0.4s ease',
        }} />
      </div>
    </div>
  )
}
