// Basic Strategy — Rivers Casino rules
// 8 decks, dealer stands on all 17s, DAS, re-split (not aces), late surrender
// Columns: dealer 2,3,4,5,6,7,8,9,10,A (index 0-9)
// Actions: H=Hit, S=Stand, D=Double, SP=Split

const HARD = {
  17: ['S','S','S','S','S','S','S','S','S','S'],
  16: ['S','S','S','S','S','H','H','H','H','H'],
  15: ['S','S','S','S','S','H','H','H','H','H'],
  14: ['S','S','S','S','S','H','H','H','H','H'],
  13: ['S','S','S','S','S','H','H','H','H','H'],
  12: ['H','H','S','S','S','H','H','H','H','H'],
  11: ['D','D','D','D','D','D','D','D','D','H'],
  10: ['D','D','D','D','D','D','D','D','H','H'],
   9: ['H','D','D','D','D','H','H','H','H','H'],
   8: ['H','H','H','H','H','H','H','H','H','H'],
   7: ['H','H','H','H','H','H','H','H','H','H'],
   6: ['H','H','H','H','H','H','H','H','H','H'],
   5: ['H','H','H','H','H','H','H','H','H','H'],
}

// Soft totals keyed by non-ace card value (A+X)
// A+2=soft13, A+7=soft18, etc.
const SOFT = {
  // A+10 (BJ) / A+9 / A+8 → always stand
  10: ['S','S','S','S','S','S','S','S','S','S'],
   9: ['S','S','S','S','S','S','S','S','S','S'],
   8: ['S','S','S','S','S','S','S','S','S','S'],
   7: ['S','D','D','D','D','S','S','H','H','H'],
   6: ['H','D','D','D','D','H','H','H','H','H'],
   5: ['H','H','D','D','D','H','H','H','H','H'],
   4: ['H','H','D','D','D','H','H','H','H','H'],
   3: ['H','H','H','D','D','H','H','H','H','H'],
   2: ['H','H','H','D','D','H','H','H','H','H'],
}

// Pairs keyed by card value ('A', '2'-'9', '10')
const PAIRS = {
  A:  ['SP','SP','SP','SP','SP','SP','SP','SP','SP','SP'],
  10: ['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'],
   9: ['SP','SP','SP','SP','SP','S', 'SP','SP','S', 'S'],
   8: ['SP','SP','SP','SP','SP','SP','SP','SP','SP','SP'],
   7: ['SP','SP','SP','SP','SP','SP','H', 'H', 'H', 'H'],
   6: ['SP','SP','SP','SP','SP','H', 'H', 'H', 'H', 'H'],
   5: ['D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'H', 'H'],
   4: ['H', 'H', 'H', 'SP','SP','H', 'H', 'H', 'H', 'H'],
   3: ['SP','SP','SP','SP','SP','SP','H', 'H', 'H', 'H'],
   2: ['SP','SP','SP','SP','SP','SP','H', 'H', 'H', 'H'],
}

export function dealerIndex(rank) {
  if (rank === 'A') return 9
  const v = ['J','Q','K'].includes(rank) ? 10 : parseInt(rank)
  if (v >= 10) return 8
  return v - 2
}

// Look up correct action
// playerCards: array of { rank, suit }
// dealerRank: string rank of dealer upcard
export function lookupAction(playerCards, dealerRank) {
  const dIdx = dealerIndex(dealerRank)

  // Detect pair
  if (playerCards.length === 2) {
    const r1 = playerCards[0].rank
    const r2 = playerCards[1].rank
    const v1 = ['J','Q','K'].includes(r1) ? 10 : (r1 === 'A' ? 11 : parseInt(r1))
    const v2 = ['J','Q','K'].includes(r2) ? 10 : (r2 === 'A' ? 11 : parseInt(r2))
    if (v1 === v2) {
      const key = r1 === 'A' ? 'A' : String(v1 === 10 ? 10 : v1)
      const row = PAIRS[key]
      if (row) return row[dIdx]
    }
  }

  // Detect soft hand
  let total = 0
  let aceCount = 0
  for (const c of playerCards) {
    if (c.rank === 'A') { aceCount++; total += 11 }
    else total += ['J','Q','K'].includes(c.rank) ? 10 : parseInt(c.rank)
  }
  while (total > 21 && aceCount > 0) { total -= 10; aceCount-- }

  if (aceCount > 0 && playerCards.length >= 2) {
    // Soft hand — find non-ace total contribution
    let nonAceTotal = 0
    for (const c of playerCards) {
      if (c.rank !== 'A') {
        nonAceTotal += ['J','Q','K'].includes(c.rank) ? 10 : parseInt(c.rank)
      }
    }
    // Normalize to single non-ace value for lookup
    const softKey = Math.min(nonAceTotal, 10)
    const row = SOFT[softKey]
    if (row) return row[dIdx]
  }

  // Hard total
  const clampedTotal = Math.min(total, 17) // 17+ all stand
  const hardKey = clampedTotal >= 5 ? clampedTotal : 5
  const row = HARD[hardKey] || HARD[5]
  return row[dIdx]
}

// Generate a random scenario for Module 5
export function generateStrategyQuestion(shoe) {
  const types = ['hard', 'soft', 'pair']
  const type = types[Math.floor(Math.random() * types.length)]

  const dealerRanks = ['2','3','4','5','6','7','8','9','10','A']
  const dealerRank = dealerRanks[Math.floor(Math.random() * dealerRanks.length)]
  const dealerCard = { rank: dealerRank, suit: ['♠','♣','♥','♦'][Math.floor(Math.random() * 4)] }

  let playerCards = []

  if (type === 'pair') {
    const pairRanks = ['2','3','4','5','6','7','8','9','10','A','J','Q','K']
    const r = pairRanks[Math.floor(Math.random() * pairRanks.length)]
    const s1 = ['♠','♣','♥','♦'][Math.floor(Math.random() * 4)]
    let s2 = ['♠','♣','♥','♦'][Math.floor(Math.random() * 4)]
    playerCards = [{ rank: r, suit: s1 }, { rank: r, suit: s2 }]
  } else if (type === 'soft') {
    // Ace + non-ace card
    const nonAceRanks = ['2','3','4','5','6','7','8','9','10']
    const r2 = nonAceRanks[Math.floor(Math.random() * nonAceRanks.length)]
    playerCards = [
      { rank: 'A', suit: ['♠','♣','♥','♦'][Math.floor(Math.random() * 4)] },
      { rank: r2, suit: ['♠','♣','♥','♦'][Math.floor(Math.random() * 4)] },
    ]
  } else {
    // Hard total — 2 cards (avoid pairs and soft hands)
    const hardCombos = []
    for (let total = 5; total <= 17; total++) {
      for (let c1 = 2; c1 <= Math.min(total - 2, 10); c1++) {
        const c2 = total - c1
        if (c2 >= 2 && c2 <= 10 && c1 !== c2) {
          hardCombos.push([c1, c2])
        }
      }
    }
    const combo = hardCombos[Math.floor(Math.random() * hardCombos.length)]
    const toRank = (v) => v === 10 ? ['10','J','Q','K'][Math.floor(Math.random() * 4)] : String(v)
    playerCards = [
      { rank: toRank(combo[0]), suit: ['♠','♣','♥','♦'][Math.floor(Math.random() * 4)] },
      { rank: toRank(combo[1]), suit: ['♠','♣','♥','♦'][Math.floor(Math.random() * 4)] },
    ]
  }

  const correctAction = lookupAction(playerCards, dealerRank)
  const key = `${playerCards.map(c=>c.rank).join('')}_vs_${dealerRank}`
  const category = type

  return { playerCards, dealerCard, correctAction, key, category }
}
