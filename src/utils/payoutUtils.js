import { breakIntoChips } from './chipUtils'

export const WIN_TYPES = [
  { id: 'regular',       label: 'Regular Win',       ratio: '1:1',    hint: '1:1' },
  { id: 'blackjack',     label: 'Blackjack',          ratio: '3:2',    hint: '3:2' },
  { id: 'insurance',     label: 'Insurance Pays',     ratio: '2:1',    hint: '2:1' },
  { id: 'even_money',    label: 'Even Money',         ratio: '1:1',    hint: '1:1' },
  { id: 'll_any20',      label: 'Lucky Ladies – Any 20',     ratio: '4:1',    hint: '4:1' },
  { id: 'll_suited20',   label: 'Lucky Ladies – Suited 20',  ratio: '10:1',   hint: '10:1' },
  { id: 'll_matched20',  label: 'Lucky Ladies – Matched 20', ratio: '25:1',   hint: '25:1' },
  { id: 'll_qqhearts',   label: 'Lucky Ladies – QQ ♥♥',      ratio: '200:1',  hint: '200:1' },
  { id: 'll_qqdbj',      label: 'Lucky Ladies – QQ ♥♥ + Dealer BJ', ratio: '1000:1', hint: '1000:1' },
]

// Calculate the payout amount for a given bet and win type
export function calcPayout(betAmount, winTypeId) {
  betAmount = Math.round(betAmount * 100) / 100
  switch (winTypeId) {
    case 'regular':
    case 'even_money':
      return Math.round(betAmount * 100) / 100
    case 'blackjack':
      return Math.round(betAmount * 1.5 * 100) / 100
    case 'insurance':
      return Math.round(betAmount * 2 * 100) / 100
    case 'll_any20':
      return Math.round(betAmount * 4 * 100) / 100
    case 'll_suited20':
      return Math.round(betAmount * 10 * 100) / 100
    case 'll_matched20':
      return Math.round(betAmount * 25 * 100) / 100
    case 'll_qqhearts':
      return Math.round(betAmount * 200 * 100) / 100
    case 'll_qqdbj':
      return Math.round(betAmount * 1000 * 100) / 100
    default:
      return betAmount
  }
}

// Generate a payout question
export function generatePayoutQuestion(level, weakItems = []) {
  const isAdaptive = level === 3 && weakItems.length > 0 && Math.random() < 0.8

  let winType
  if (isAdaptive) {
    const item = weakItems[Math.floor(Math.random() * weakItems.length)]
    winType = WIN_TYPES.find(w => w.id === item.data?.winTypeId) || WIN_TYPES[0]
  } else {
    // Level 1+2 use simpler win types; level 3 uses all including Lucky Ladies
    const pool = level < 3
      ? WIN_TYPES.slice(0, 4)
      : WIN_TYPES
    winType = pool[Math.floor(Math.random() * pool.length)]
  }

  // Generate a bet
  // For blackjack: use denominations that produce non-round 3:2 results with pinks
  let betAmount
  const usePink = level >= 2 && (winType.id === 'blackjack' || Math.random() > 0.5)

  if (usePink && winType.id === 'blackjack') {
    // Bets that yield non-round BJ payouts: must end in $2.50
    const base = [5, 10, 15, 20, 25, 50, 75, 100][Math.floor(Math.random() * 8)]
    betAmount = base + 2.5 * (Math.floor(Math.random() * 3) + 1)
  } else if (winType.id.startsWith('ll_')) {
    // Lucky Ladies side bet — small amounts
    const amounts = [5, 10, 15, 25]
    betAmount = amounts[Math.floor(Math.random() * amounts.length)]
  } else {
    const amounts = [5, 10, 15, 20, 25, 50, 75, 100, 150, 200]
    betAmount = amounts[Math.floor(Math.random() * amounts.length)]
  }

  const payout = calcPayout(betAmount, winType.id)
  const chips = breakIntoChips(betAmount, level >= 2)

  return {
    winType,
    betAmount,
    chips,
    correctPayout: payout,
    key: `${winType.id}_${betAmount}`,
  }
}
