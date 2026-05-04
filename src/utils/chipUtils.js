export const CHIP_TYPES = [
  { value: 100,  label: '$100',   bg: '#212121', text: '#FFFFFF', border: '#555555' },
  { value: 25,   label: '$25',    bg: '#2E7D32', text: '#FFFFFF', border: '#1B5E20' },
  { value: 5,    label: '$5',     bg: '#CC0000', text: '#FFFFFF', border: '#8B0000' },
  { value: 2.5,  label: '$2.50', bg: '#FF69B4', text: '#FFFFFF', border: '#C2185B' },
  { value: 1,    label: '$1',     bg: '#FFFFFF', text: '#1a1a2e', border: '#888888' },
]

// Returns array of { chip, count } from highest to lowest
export function breakIntoChips(amount, allowPink = true) {
  let remaining = Math.round(amount * 100)
  const result = []
  const denominations = allowPink ? CHIP_TYPES : CHIP_TYPES.filter(c => c.value !== 2.5)
  for (const chip of denominations) {
    const chipCents = Math.round(chip.value * 100)
    const count = Math.floor(remaining / chipCents)
    if (count > 0) {
      result.push({ chip, count })
      remaining -= count * chipCents
    }
  }
  return result
}

export function stackTotal(chipCounts) {
  return chipCounts.reduce((sum, { chip, count }) => sum + chip.value * count, 0)
}

// ── Level 1: single denomination ─────────────────────────────────────────────

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function genLevel1() {
  const chip = CHIP_TYPES[randInt(0, CHIP_TYPES.length - 1)]
  const count = randInt(1, 10)
  return {
    stacks: [[{ chip, count }]],
    total: chip.value * count,
  }
}

// ── Level 2: mixed denominations, round totals (no pinks) ─────────────────────

function genLevel2() {
  // Target a round total (multiple of $5)
  const roundTargets = [5,10,15,20,25,30,50,75,100,125,150,200,250,300,400,500]
  const target = roundTargets[randInt(0, roundTargets.length - 1)]
  const chips = breakIntoChips(target, false)
  return {
    stacks: [chips],
    total: target,
  }
}

// ── Level 3: adaptive mixed, including pinks, multiple circles ─────────────────

function genLevel3(weakAmounts = []) {
  // 80% chance to use a known weak amount, else random
  if (weakAmounts.length > 0 && Math.random() < 0.8) {
    const amount = weakAmounts[randInt(0, weakAmounts.length - 1)]
    return {
      stacks: [breakIntoChips(amount, true)],
      total: amount,
    }
  }
  const circleCount = randInt(1, 3)
  const stacks = []
  let total = 0
  for (let i = 0; i < circleCount; i++) {
    const chipOptions = CHIP_TYPES.filter(c => c.value !== 2.5 || Math.random() > 0.5)
    const numChips = randInt(1, 3)
    const stackChips = []
    for (let j = 0; j < numChips; j++) {
      const chip = chipOptions[randInt(0, chipOptions.length - 1)]
      const count = randInt(1, 5)
      stackChips.push({ chip, count })
      total += chip.value * count
    }
    stacks.push(stackChips)
  }
  return { stacks, total: Math.round(total * 100) / 100 }
}

export function generateChipQuestion(level, weakAmounts = []) {
  if (level === 1) return genLevel1()
  if (level === 2) return genLevel2()
  return genLevel3(weakAmounts)
}

// Unique key for a chip arrangement (for weak spot tracking)
export function chipQuestionKey(stacks) {
  return stacks
    .map(s => s.map(({ chip, count }) => `${chip.value}x${count}`).join('+'))
    .join('|')
}
