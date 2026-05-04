// Rivers Casino Rules Quiz — Question Bank
// All answers based on: 8 decks, dealer stands all 17s, 3:2 BJ, DAS, re-split (not aces), late surrender, insurance 2:1

export const RULES_QUESTIONS = [
  {
    id: 'decks',
    q: 'How many decks are used in this game?',
    choices: ['4', '6', '8', '2'],
    answer: '8',
  },
  {
    id: 'bj_payout',
    q: 'What is the payout for a natural blackjack?',
    choices: ['1:1', '6:5', '3:2', '2:1'],
    answer: '3:2',
  },
  {
    id: 'dealer_stand',
    q: 'When does the dealer stand?',
    choices: ['Hard 17 or more only', 'Soft 17 or more', 'All 17s (hard and soft)', 'Hard 18 or more'],
    answer: 'All 17s (hard and soft)',
  },
  {
    id: 'insurance_payout',
    q: 'What does insurance pay if the dealer has blackjack?',
    choices: ['1:1', '3:2', '2:1', '5:2'],
    answer: '2:1',
  },
  {
    id: 'insurance_trigger',
    q: 'When is insurance offered?',
    choices: ['Dealer shows a 10', 'Dealer shows an Ace', 'Dealer shows a face card', 'Any time'],
    answer: 'Dealer shows an Ace',
  },
  {
    id: 'even_money',
    q: 'What is even money?',
    choices: [
      '1:1 payout on blackjack when dealer shows an Ace',
      'Always taking 1:1 on any win',
      '3:2 payout when you have two even cards',
      'A push result',
    ],
    answer: '1:1 payout on blackjack when dealer shows an Ace',
  },
  {
    id: 'split_aces',
    q: 'After splitting aces, can you re-split if you receive another ace?',
    choices: ['Yes, unlimited times', 'Yes, once', 'No', 'Only if the dealer allows it'],
    answer: 'No',
  },
  {
    id: 'resplit_non_ace',
    q: 'Can you re-split non-ace pairs?',
    choices: ['No', 'Yes, once', 'Yes, up to 3 times', 'Yes, unlimited times'],
    answer: 'Yes, once',
  },
  {
    id: 'das',
    q: 'Can you double down after splitting (DAS)?',
    choices: ['Yes, on any pair', 'Yes, but not on aces', 'No', 'Only on 10-value pairs'],
    answer: 'Yes, but not on aces',
  },
  {
    id: 'surrender',
    q: 'What type of surrender is allowed?',
    choices: ['Early surrender', 'Late surrender', 'No surrender', 'Surrender on first two cards only before looking'],
    answer: 'Late surrender',
  },
  {
    id: 'surrender_timing',
    q: 'When can you use late surrender?',
    choices: [
      'Before the dealer checks for blackjack',
      'After the dealer checks for blackjack and does not have it',
      'Any time before you stand',
      'Only on the first hand',
    ],
    answer: 'After the dealer checks for blackjack and does not have it',
  },
  {
    id: 'll_any20',
    q: 'Lucky Ladies: What does any 20 pay?',
    choices: ['2:1', '4:1', '10:1', '25:1'],
    answer: '4:1',
  },
  {
    id: 'll_suited20',
    q: 'Lucky Ladies: What does a suited 20 pay?',
    choices: ['4:1', '10:1', '25:1', '200:1'],
    answer: '10:1',
  },
  {
    id: 'll_matched20',
    q: 'Lucky Ladies: What does a matched 20 (same rank and suit) pay?',
    choices: ['10:1', '25:1', '100:1', '200:1'],
    answer: '25:1',
  },
  {
    id: 'll_qqhearts',
    q: 'Lucky Ladies: What do Queen of Hearts pair pay?',
    choices: ['25:1', '100:1', '200:1', '500:1'],
    answer: '200:1',
  },
  {
    id: 'll_qqdbj',
    q: 'Lucky Ladies: What do two Queens of Hearts pay when the dealer ALSO has blackjack?',
    choices: ['200:1', '500:1', '1000:1', '2000:1'],
    answer: '1000:1',
  },
  {
    id: 'push',
    q: 'What happens when the player and dealer have the same total?',
    choices: ['Dealer wins', 'Player wins', 'Push — bet is returned', 'Player loses half'],
    answer: 'Push — bet is returned',
  },
  {
    id: 'bj_definition',
    q: 'What defines a blackjack (natural)?',
    choices: [
      'Any hand totaling 21',
      'Any hand totaling 21 with three or more cards',
      'An Ace and a 10-value card on the first two cards',
      'An Ace and any face card',
    ],
    answer: 'An Ace and a 10-value card on the first two cards',
  },
  {
    id: 'dealer_bj_insurance',
    q: 'If the dealer has blackjack and you took insurance, what happens to your main bet?',
    choices: [
      'You win both insurance and main bet',
      'Insurance pays 2:1 but you lose your main bet',
      'Everything pushes',
      'You lose insurance but main bet pushes',
    ],
    answer: 'Insurance pays 2:1 but you lose your main bet',
  },
  {
    id: 'split_limit',
    q: 'What is the maximum number of hands from a split?',
    choices: ['2', '3', '4 (re-split once)', 'Unlimited'],
    answer: '4 (re-split once)',
  },
  {
    id: 'double_when',
    q: 'On which hands can you double down?',
    choices: ['Only 10 or 11', 'Any first two cards', 'Only hard totals 9-11', 'Only before the first card'],
    answer: 'Any first two cards',
  },
  {
    id: 'dealer_bust',
    q: 'If the dealer busts, what happens to players still in the hand?',
    choices: ['They push', 'They win 1:1', 'They win 3:2', 'It depends on their hand total'],
    answer: 'They win 1:1',
  },
  {
    id: 'hole_card',
    q: 'When does the dealer receive their hole card (face-down card)?',
    choices: [
      'After all players act',
      'At the initial deal — one face-up, one face-down',
      'Before any player acts',
      'The dealer does not get a hole card',
    ],
    answer: 'At the initial deal — one face-up, one face-down',
  },
  {
    id: 'ace_split_double',
    q: 'Can you double after splitting aces?',
    choices: ['Yes', 'No', 'Only if you receive a 10-value card', 'Only on the first split'],
    answer: 'No',
  },
  {
    id: 'insurance_amount',
    q: 'How much can you bet on insurance?',
    choices: [
      'Up to your full main bet',
      'Up to half your main bet',
      'Exactly your main bet',
      'Any amount up to the table max',
    ],
    answer: 'Up to half your main bet',
  },
]

export function getRandomQuestions(count = 20) {
  const shuffled = [...RULES_QUESTIONS].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(count, shuffled.length))
}
