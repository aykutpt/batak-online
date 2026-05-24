import { describe, it, expect } from 'vitest';
import {
  createDeck, shuffleDeck, dealCards, sortHand, RANK_VALUE,
  isLegalMove, getLegalCards, determineTrickWinner, validateBid, calculateRoundScore, checkGameEnd,
} from '../gameRules';
import { Card, Suit, PlayedCard, Seat } from '../types';

function card(rank: string, suit: Suit): Card {
  return { rank: rank as Card['rank'], suit, id: `${rank}-${suit}` };
}

function played(seat: Seat, c: Card, order = 0): PlayedCard {
  return { seat, card: c, order };
}

const ZERO_SCORES = { south: 0, west: 0, north: 0, east: 0 };

// ─── Deck ─────────────────────────────────────────────────────────────────────

describe('createDeck', () => {
  it('has 52 unique cards', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);
    expect(new Set(deck.map((c) => c.id)).size).toBe(52);
  });

  it('has 13 cards per suit', () => {
    const deck = createDeck();
    for (const suit of ['spades','hearts','diamonds','clubs'] as Suit[]) {
      expect(deck.filter((c) => c.suit === suit)).toHaveLength(13);
    }
  });

  it('ranks A > K > 2', () => {
    expect(RANK_VALUE['A']).toBeGreaterThan(RANK_VALUE['K']);
    expect(RANK_VALUE['K']).toBeGreaterThan(RANK_VALUE['2']);
    expect(RANK_VALUE['A']).toBe(13);
    expect(RANK_VALUE['2']).toBe(1);
  });
});

describe('dealCards', () => {
  it('gives exactly 13 cards to each seat', () => {
    const hands = dealCards(shuffleDeck(createDeck()));
    for (const h of Object.values(hands)) expect(h).toHaveLength(13);
  });

  it('covers all 52 unique cards', () => {
    const hands = dealCards(createDeck());
    const all = Object.values(hands).flat();
    expect(all).toHaveLength(52);
    expect(new Set(all.map((c) => c.id)).size).toBe(52);
  });
});

// ─── Legal Moves ──────────────────────────────────────────────────────────────

describe('isLegalMove', () => {
  const hand = [card('A','spades'), card('K','hearts'), card('Q','diamonds')];

  it('allows any card when leading', () => {
    expect(isLegalMove(card('A','spades'), hand, null).legal).toBe(true);
  });

  it('allows matching lead suit', () => {
    expect(isLegalMove(card('A','spades'), hand, 'spades').legal).toBe(true);
  });

  it('blocks off-suit when player has lead suit', () => {
    const result = isLegalMove(card('K','hearts'), hand, 'spades');
    expect(result.legal).toBe(false);
    expect(result.reason).toBeTruthy();
  });

  it('allows any card when player has no lead suit', () => {
    expect(isLegalMove(card('A','spades'), [card('A','spades')], 'clubs').legal).toBe(true);
  });
});

describe('getLegalCards', () => {
  const hand = [card('A','spades'), card('K','hearts'), card('Q','hearts')];

  it('returns all cards when leading', () => {
    expect(getLegalCards(hand, null)).toHaveLength(3);
  });

  it('returns only lead suit cards when available', () => {
    const legal = getLegalCards(hand, 'hearts');
    expect(legal).toHaveLength(2);
    expect(legal.every((c) => c.suit === 'hearts')).toBe(true);
  });

  it('returns all when no lead suit in hand', () => {
    expect(getLegalCards(hand, 'clubs')).toHaveLength(3);
  });
});

// ─── Trick Winner ─────────────────────────────────────────────────────────────

describe('determineTrickWinner', () => {
  it('highest lead suit wins with no trump', () => {
    const trick = [
      played('south', card('A','spades'), 0),
      played('west',  card('K','spades'), 1),
      played('north', card('Q','spades'), 2),
      played('east',  card('J','spades'), 3),
    ];
    expect(determineTrickWinner(trick, 'spades', 'hearts')).toBe('south');
  });

  it('trump beats higher non-trump', () => {
    const trick = [
      played('south', card('A','spades'), 0),
      played('west',  card('2','hearts'), 1), // trump
      played('north', card('K','spades'), 2),
      played('east',  card('Q','spades'), 3),
    ];
    expect(determineTrickWinner(trick, 'spades', 'hearts')).toBe('west');
  });

  it('highest trump wins among multiple trumps', () => {
    const trick = [
      played('south', card('A','spades'),  0),
      played('west',  card('5','hearts'),  1),
      played('north', card('A','hearts'),  2), // highest trump
      played('east',  card('2','hearts'),  3),
    ];
    expect(determineTrickWinner(trick, 'spades', 'hearts')).toBe('north');
  });

  it('off-suit non-trump cannot win', () => {
    const trick = [
      played('south', card('5','spades'), 0),
      played('west',  card('A','clubs'),  1), // off-suit, cannot win
      played('north', card('4','spades'), 2),
      played('east',  card('3','spades'), 3),
    ];
    expect(determineTrickWinner(trick, 'spades', 'hearts')).toBe('south');
  });
});

// ─── Bidding ─────────────────────────────────────────────────────────────────

describe('validateBid', () => {
  it('pass is always valid', () => {
    expect(validateBid('pass', 7).valid).toBe(true);
  });

  it('bid must be higher than current highest', () => {
    expect(validateBid(7, 7).valid).toBe(false);
    expect(validateBid(8, 7).valid).toBe(true);
  });

  it('minimum bid is 5', () => {
    expect(validateBid(4 as never, 0).valid).toBe(false);
    expect(validateBid(5, 0).valid).toBe(true);
  });
});

// ─── Scoring ─────────────────────────────────────────────────────────────────

describe('calculateRoundScore', () => {
  it('declarer gains bid×10 on success', () => {
    const result = calculateRoundScore({
      tricksWon: { south: 8, west: 2, north: 2, east: 1 },
      declarerSeat: 'south', bidAmount: 7, trumpSuit: 'spades',
      round: 1, currentTotalScores: ZERO_SCORES,
    });
    expect(result.declarerSucceeded).toBe(true);
    expect(result.pointsGained.south).toBe(70);
    expect(result.pointsGained.west).toBe(2);
  });

  it('declarer loses bid×10 on failure', () => {
    const result = calculateRoundScore({
      tricksWon: { south: 6, west: 3, north: 2, east: 2 },
      declarerSeat: 'south', bidAmount: 8, trumpSuit: 'hearts',
      round: 1, currentTotalScores: ZERO_SCORES,
    });
    expect(result.declarerSucceeded).toBe(false);
    expect(result.pointsGained.south).toBe(-80);
    expect(result.pointsGained.west).toBe(3);
  });

  it('exact bid counts as success', () => {
    const result = calculateRoundScore({
      tricksWon: { south: 5, west: 3, north: 3, east: 2 },
      declarerSeat: 'south', bidAmount: 5, trumpSuit: 'clubs',
      round: 1, currentTotalScores: ZERO_SCORES,
    });
    expect(result.declarerSucceeded).toBe(true);
    expect(result.pointsGained.south).toBe(50);
  });

  it('accumulates total scores correctly', () => {
    const result = calculateRoundScore({
      tricksWon: { south: 7, west: 2, north: 2, east: 2 },
      declarerSeat: 'south', bidAmount: 7, trumpSuit: 'diamonds',
      round: 2, currentTotalScores: { south: 70, west: 5, north: 5, east: 5 },
    });
    expect(result.totalScores.south).toBe(140);
    expect(result.totalScores.west).toBe(7);
  });
});

describe('checkGameEnd', () => {
  it('score limit triggers on reaching limit', () => {
    expect(checkGameEnd({ south: 500, west: 100, north: 50, east: 30 }, { mode: 'score_limit', scoreLimit: 500, roundLimit: 10 }, 3)).toBe(true);
  });

  it('round limit triggers when rounds exhausted', () => {
    expect(checkGameEnd(ZERO_SCORES, { mode: 'round_limit', scoreLimit: 500, roundLimit: 10 }, 10)).toBe(true);
    expect(checkGameEnd(ZERO_SCORES, { mode: 'round_limit', scoreLimit: 500, roundLimit: 10 }, 9)).toBe(false);
  });
});
