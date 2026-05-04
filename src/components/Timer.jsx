export default function Timer({ timeLeft, total = 120 }) {
  const pct = (timeLeft / total) * 100
  const isLow = timeLeft <= 15
  const color = isLow ? '#ef4444' : '#FFD700'
  const mm = String(Math.floor(timeLeft / 60)).padStart(2, '0')
  const ss = String(timeLeft % 60).padStart(2, '0')

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 80 }}>
      <svg width="44" height="44" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
        <circle
          cx="22" cy="22" r="18"
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeDasharray={`${2 * Math.PI * 18}`}
          strokeDashoffset={`${2 * Math.PI * 18 * (1 - pct / 100)}`}
          strokeLinecap="round"
          transform="rotate(-90 22 22)"
          style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s' }}
        />
        <text
          x="22" y="27"
          textAnchor="middle"
          fontSize="11"
          fontWeight="700"
          fill={color}
          fontFamily="Inter, system-ui"
        >
          {mm}:{ss}
        </text>
      </svg>
    </div>
  )
}
