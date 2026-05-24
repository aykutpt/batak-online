import { Card, Suit, Rank, Seat, BidValue, PlayedCard, RoundResult, GameConfig } from './types';

export const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
export const RANKS: Rank[] = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];
export const SEATS: Seat[] = ['south', 'west', 'north', 'east'];

export const RANK_VALUE: Record<Rank, number> = {
  A: 13, K: 12, Q: 11, J: 10,
  '10': 9, '9': 8, '8': 7, '7': 6,
  '6': 5, '5': 4, '4': 3, '3': 2, '2': 1,
};

export const SUIT_NAMES: Record<Suit, string> = {
  spades: 'Maça', hearts: 'Kupa', diamonds: 'Karo', clubs: 'Sinek',
};

export const SUIT_SYMBOLS: Record<Suit, string> = {
  spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣',
};

// ─── Deck ─────────────────────────────────────────────────────────────────────

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, id: `${rank}-${suit}` });
    }
  }
  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function dealCards(deck: Card[]): Record<Seat, Card[]> {
  const hands = { south: [] as Card[], west: [] as Card[], north: [] as Card[], east: [] as Card[] };
  for (let i = 0; i < 52; i++) {
    hands[SEATS[i % 4]].push(deck[i]);
  }
  return hands;
}

export function sortHand(hand: Card[]): Card[] {
  const SUIT_ORDER: Record<Suit, number> = { spades: 0, hearts: 1, diamonds: 2, clubs: 3 };
  return [...hand].sort((a, b) => {
    if (SUIT_ORDER[a.suit] !== SUIT_ORDER[b.suit]) return SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit];
    return RANK_VALUE[b.rank] - RANK_VALUE[a.rank];
  });
}

// ─── Legal Move Logic ─────────────────────────────────────────────────────────

export function getLegalCards(hand: Card[], leadSuit: Suit | null): Card[] {
  if (!leadSuit) return hand;
  const suited = hand.filter((c) => c.suit === leadSuit);
  return suited.length > 0 ? suited : hand;
}

export function isLegalMove(
  card: Card,
  hand: Card[],
  leadSuit: Suit | null,
): { legal: boolean; reason?: string } {
  if (!leadSuit) return { legal: true };
  const hasLeadSuit = hand.some((c) => c.suit === leadSuit);
  if (hasLeadSuit && card.suit !== leadSuit) {
    return {
      legal: false,
      reason: `Geçersiz hamle: ${SUIT_NAMES[leadSuit]} renginden kartın olduğu için onu oynamalısın.`,
    };
  }
  return { legal: true };
}

// ─── Trick Resolution ─────────────────────────────────────────────────────────

export function determineTrickWinner(
  trick: PlayedCard[],
  leadSuit: Suit,
  trumpSuit: Suit,
): Seat {
  const trumpCards = trick.filter((tc) => tc.card.suit === trumpSuit);
  if (trumpCards.length > 0) {
    return trumpCards.reduce((best, cur) =>
      RANK_VALUE[cur.card.rank] > RANK_VALUE[best.card.rank] ? cur : best,
    ).seat;
  }
  const leadCards = trick.filter((tc) => tc.card.suit === leadSuit);
  return leadCards.reduce((best, cur) =>
    RANK_VALUE[cur.card.rank] > RANK_VALUE[best.card.rank] ? cur : best,
  ).seat;
}

// ─── Bidding Validation ───────────────────────────────────────────────────────

export function validateBid(
  value: BidValue,
  currentHighest: number,
): { valid: boolean; reason?: string } {
  if (value === 'pass') return { valid: true };
  const num = value as number;
  if (num < 5) return { valid: false, reason: 'Minimum ihale 5 olmalı.' };
  if (num > 13) return { valid: false, reason: 'Maximum ihale 13.' };
  if (num <= currentHighest) {
    return { valid: false, reason: `${currentHighest} üzerinde teklif vermelisin.` };
  }
  return { valid: true };
}

// ─── Seat Navigation ──────────────────────────────────────────────────────────

export function getNextSeat(seat: Seat): Seat {
  return SEATS[(SEATS.indexOf(seat) + 1) % 4];
}

export function getSeatIndex(seat: Seat): number {
  return SEATS.indexOf(seat);
}

// ─── Scoring ─────────────────────────────────────────────────────────────────

export function calculateRoundScore(params: {
  tricksWon: Record<Seat, number>;
  declarerSeat: Seat;
  bidAmount: number;
  trumpSuit: Suit;
  round: number;
  currentTotalScores: Record<Seat, number>;
}): RoundResult {
  const { tricksWon, declarerSeat, bidAmount, trumpSuit, round, currentTotalScores } = params;
  const declarerTricks = tricksWon[declarerSeat];
  const declarerSucceeded = declarerTricks >= bidAmount;

  const pointsGained = {} as Record<Seat, number>;
  for (const seat of SEATS) {
    pointsGained[seat] =
      seat === declarerSeat
        ? declarerSucceeded
          ? bidAmount * 10
          : -(bidAmount * 10)
        : tricksWon[seat];
  }

  const totalScores = {} as Record<Seat, number>;
  for (const seat of SEATS) {
    totalScores[seat] = (currentTotalScores[seat] ?? 0) + pointsGained[seat];
  }

  return { round, declarerSeat, bidAmount, trumpSuit, tricksWon, pointsGained, declarerSucceeded, totalScores };
}

// ─── Game End Check ───────────────────────────────────────────────────────────

export function checkGameEnd(
  totalScores: Record<Seat, number>,
  config: GameConfig,
  currentRound: number,
): boolean {
  if (config.mode === 'score_limit') {
    return Object.values(totalScores).some((s) => s >= config.scoreLimit);
  }
  return currentRound >= config.roundLimit;
}

export function getWinningSeat(totalScores: Record<Seat, number>): Seat {
  return (Object.entries(totalScores) as [Seat, number][]).reduce((best, cur) =>
    cur[1] > best[1] ? cur : best,
  )[0];
}
