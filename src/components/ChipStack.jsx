import Chip from './Chip'

// Renders a single stack of chips: overlapping vertically, highest value on bottom
// chipCounts: array of { chip, count }
export default function ChipStack({ chipCounts, size = 48, label = null }) {
  const overlap = Math.round(size * 0.55)  // how much each chip overlaps
  const chips = []
  // Flatten into individual chips, highest value first (bottom of stack)
  for (const { chip, count } of chipCounts) {
    for (let i = 0; i < count; i++) chips.push(chip)
  }

  const totalHeight = size + (chips.length - 1) * overlap

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      {label && (
        <div style={{ color: '#FFD700', fontSize: 12, fontWeight: 600 }}>{label}</div>
      )}
      <div style={{ position: 'relative', width: size, height: totalHeight }}>
        {chips.map((chip, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: (chips.length - 1 - i) * overlap,
              left: 0,
              zIndex: i,
            }}
          >
            <Chip chip={chip} size={size} />
          </div>
        ))}
      </div>
    </div>
  )
}
