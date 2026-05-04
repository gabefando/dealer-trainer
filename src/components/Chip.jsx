export default function Chip({ chip, size = 48 }) {
  const { bg, text, border, label } = chip
  const fontSize = size <= 36 ? size * 0.22 : size * 0.2
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: bg,
        border: `${Math.max(2, size * 0.05)}px solid ${border}`,
        color: text,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: fontSize,
        fontWeight: 700,
        fontFamily: 'Inter, system-ui, sans-serif',
        flexShrink: 0,
        boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
        userSelect: 'none',
        lineHeight: 1,
        textAlign: 'center',
        padding: 2,
      }}
    >
      {label}
    </div>
  )
}
