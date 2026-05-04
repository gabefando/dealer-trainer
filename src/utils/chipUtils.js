export const CHIP_TYPES = [
  { value: 100,  label: '$100',   bg: '#212121', text: '#FFFFFF', border: '#555555' },
  { value: 25,   label: '$25',    bg: '#2E7D32', text: '#FFFFFF', border: '#1B5E20' },
  { value: 5,    label: '$5',     bg: '#CC0000', text: '#FFFFFF', border: '#8B0000' },
  { value: 2.5,  label: '$2.50',  bg: '#FF69B4', text: '#FFFFFF', border: '#C2185B' },
  { value: 1,    label: '$1',     bg: '#FFFFFF', text: '#1a1a2e', border: '#888888' },
]

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// Returns array of { chip, count } from highest to lowest denomination
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

// ── Realistic messy bet generator ────────────────────────────────────────────
// Picks 2–4 random denominations, random counts — produces bets like $9.50, $13.50, etc.
function genRealisticStack(minDenoms = 2, maxDenoms = 4, maxPerDenom = 6) {
  const numDenoms = randInt(minDenoms, Math.min(maxDenoms, CHIP_TYPES.length))
  const shuffled = [...CHIP_TYPES].sort(() => Math.random() - 0.5)
  const selected = shuffled.slice(0, numDenoms)
  // Sort high to low for display
  selected.sort((a, b) => b.value - a.value)
  return selected.map(chip => ({ chip, count: randInt(1, maxPerDenom) }))
}

// ── Level 1: realistic mixed (multiple colors, non-round totals) ──────────────
function genLevel1() {
  return {
    stacks: [genRealisticStack(2, 3, 5)],
    get total() { return Math.round(stackTotal(this.stacks[0]) * 100) / 100 },
  }
}

// Fix: compute total eagerly
function makeQuestion(stacks) {
  const total = Math.round(stacks.reduce((sum, stack) => sum + stackTotal(stack), 0) * 100) / 100
  return { stacks, total }
}

// ── Level 2: multiple bet circles, messier bets ────────────────────────────────
function genLevel2() {
  const circleCount = randInt(1, 3)
  const stacks = []
  for (let i = 0; i < circleCount; i++) {
    stacks.push(genRealisticStack(2, 4, 6))
  }
  return makeQuestion(stacks)
}

// ── Level 3: adaptive — weighted to weak amounts ────────────────────────────────
function genLevel3(weakAmounts = []) {
  if (weakAmounts.length > 0 && Math.random() < 0.8) {
    const amount = weakAmounts[randInt(0, weakAmounts.length - 1)]
    return makeQuestion([breakIntoChips(amount, true)])
  }
  // Random multi-circle, all denominations
  const circleCount = randInt(1, 3)
  const stacks = []
  for (let i = 0; i < circleCount; i++) {
    stacks.push(genRealisticStack(2, 5, 8))
  }
  return makeQuestion(stacks)
}

export function generateChipQuestion(level, weakAmounts = []) {
  if (level === 1) return genLevel1()
  if (level === 2) return genLevel2()
  return genLevel3(weakAmounts)
}

export function chipQuestionKey(stacks) {
  return stacks
    .map(s => s.map(({ chip, count }) => `${chip.value}x${count}`).join('+'))
    .join('|')
}
