export const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A']
export const SUITS = ['♠','♣','♥','♦']
export const RED_SUITS = new Set(['♥','♦'])

// Numeric value of a rank (face = 10, A handled separately)
export function rankValue(rank) {
  if (['J','Q','K'].includes(rank)) return 10
  if (rank === 'A') return 11
  return parseInt(rank)
}

// Build an 8-deck shoe
export function buildShoe() {
  const shoe = []
  for (let d = 0; d < 8; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        shoe.push({ rank, suit })
      }
    }
  }
  // Fisher-Yates shuffle
  for (let i = shoe.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shoe[i], shoe[j]] = [shoe[j], shoe[i]]
  }
  return shoe
}

// Calculate best hand value (soft hand logic)
export function handValue(cards) {
  let total = 0
  let aces = 0
  for (const card of cards) {
    const v = rankValue(card.rank)
    if (card.rank === 'A') {
      aces++
      total += 11
    } else {
      total += v
    }
  }
  while (total > 21 && aces > 0) {
    total -= 10
    aces--
  }
  return total
}

// Is the hand soft? (has an ace counting as 11)
export function isSoft(cards) {
  let total = 0
  let aces = 0
  for (const card of cards) {
    if (card.rank === 'A') { aces++; total += 11 }
    else total += rankValue(card.rank)
  }
  while (total > 21 && aces > 0) { total -= 10; aces-- }
  return aces > 0
}

// Is the hand a pair?
export function isPair(cards) {
  if (cards.length !== 2) return false
  const v1 = rankValue(cards[0].rank)
  const v2 = rankValue(cards[1].rank)
  return v1 === v2
}

// Get pair key (for strategy lookup) — normalizes face cards to '10'
export function pairKey(cards) {
  const r = cards[0].rank
  if (['J','Q','K'].includes(r)) return '10'
  return r
}

// Deal N cards from shoe (modifies shoe array in place)
export function dealCards(shoe, n) {
  return shoe.splice(0, n)
}

// Generate a random hand for Module 3 (2-6 cards, from shoe)
export function generateHandQuestion(shoe) {
  const count = Math.floor(Math.random() * 5) + 2 // 2-6 cards
  const cards = dealCards(shoe, count)
  const total = handValue(cards)
  return { cards, total }
}

// Dealer upcard index for strategy table lookup
// Dealer 2→index 0, 3→1, ... 10/J/Q/K→8, A→9
export function dealerUpcardIndex(rank) {
  if (rank === 'A') return 9
  const v = rankValue(rank)
  if (v >= 10) return 8
  return v - 2
}
