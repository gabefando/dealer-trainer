const RED_SUITS = new Set(['♥', '♦'])

export default function Card({ rank, suit, faceDown = false, width = 56, height = 80 }) {
  const isRed = RED_SUITS.has(suit)
  const color = isRed ? '#CC0000' : '#1a1a2e'
  const fontSize = width * 0.28

  if (faceDown) {
    return (
      <div style={{
        width,
        height,
        borderRadius: width * 0.12,
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        border: '2px solid #444',
        boxShadow: '2px 2px 6px rgba(0,0,0,0.5)',
        flexShrink: 0,
      }} />
    )
  }

  return (
    <div style={{
      width,
      height,
      borderRadius: width * 0.12,
      background: '#FFFFFF',
      border: '1.5px solid #ccc',
      boxShadow: '2px 2px 6px rgba(0,0,0,0.4)',
      position: 'relative',
      flexShrink: 0,
      userSelect: 'none',
    }}>
      {/* Top-left */}
      <div style={{
        position: 'absolute',
        top: 4,
        left: 5,
        color,
        lineHeight: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        <span style={{ fontSize, fontWeight: 700 }}>{rank}</span>
        <span style={{ fontSize: fontSize * 0.9 }}>{suit}</span>
      </div>
      {/* Center suit */}
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color,
        fontSize: fontSize * 1.6,
      }}>
        {suit}
      </div>
      {/* Bottom-right (rotated) */}
      <div style={{
        position: 'absolute',
        bottom: 4,
        right: 5,
        color,
        lineHeight: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        transform: 'rotate(180deg)',
      }}>
        <span style={{ fontSize, fontWeight: 700 }}>{rank}</span>
        <span style={{ fontSize: fontSize * 0.9 }}>{suit}</span>
      </div>
    </div>
  )
}
