// Re-exports the same bot logic from shared gameRules + own scoring heuristics
import { Card, Suit, PlayedCard, Seat, Rank } from '@shared/types';
import { RANK_VALUE, SUITS, getLegalCards, determineTrickWinner } from '@shared/gameRules';

const HIGH_RANKS: Rank[] = ['A', 'K', 'Q', 'J'];

export function estimateBotBid(hand: Card[]): number {
  let score = 0;
  const suitLengths: Record<Suit, number> = { spades: 0, hearts: 0, diamonds: 0, clubs: 0 };
  for (const card of hand) {
    suitLengths[card.suit]++;
    if (card.rank === 'A') score += 1.0;
    else if (card.rank === 'K') score += 0.75;
    else if (card.rank === 'Q') score += 0.5;
    else if (card.rank === 'J') score += 0.25;
  }
  for (const suit of SUITS) {
    if (suitLengths[suit] >= 5) score += suitLengths[suit] - 4;
  }
  return Math.round(score);
}

export function chooseBotTrump(hand: Card[]): Suit {
  const suitScore: Record<Suit, number> = { spades: 0, hearts: 0, diamonds: 0, clubs: 0 };
  for (const card of hand) suitScore[card.suit] += RANK_VALUE[card.rank] + 1;
  return (Object.entries(suitScore) as [Suit, number][]).sort((a, b) => b[1] - a[1])[0][0];
}

export function chooseBotCard(
  hand: Card[], leadSuit: Suit | null, trumpSuit: Suit,
  trickCards: PlayedCard[], botSeat: Seat, isDeclarer: boolean,
): Card {
  const legal = getLegalCards(hand, leadSuit);
  if (legal.length === 1) return legal[0];

  const currentWinnerId = trickCards.length > 0 && leadSuit
    ? determineTrickWinner(trickCards, leadSuit, trumpSuit) : null;

  if (!leadSuit) {
    if (isDeclarer) {
      const nonTrump = legal.filter((c) => c.suit !== trumpSuit);
      const pool = nonTrump.length > 0 ? nonTrump : legal;
      const high = pool.filter((c) => HIGH_RANKS.includes(c.rank));
      return (high.length > 0 ? high : pool).sort((a, b) => RANK_VALUE[b.rank] - RANK_VALUE[a.rank])[0];
    }
    const sorted = [...legal].sort((a, b) => RANK_VALUE[a.rank] - RANK_VALUE[b.rank]);
    return sorted[Math.floor(sorted.length / 2)];
  }

  const cwCard = trickCards.find((tc) => tc.seat === currentWinnerId)?.card;
  const leadCards = legal.filter((c) => c.suit === leadSuit);
  const trumpCards = legal.filter((c) => c.suit === trumpSuit);
  const discard = [...legal].sort((a, b) => RANK_VALUE[a.rank] - RANK_VALUE[b.rank]);

  if (leadCards.length > 0) {
    const canWin = cwCard && cwCard.suit === leadSuit
      ? leadCards.filter((c) => RANK_VALUE[c.rank] > RANK_VALUE[cwCard.rank]) : leadCards;
    if (canWin.length > 0 && (isDeclarer || Math.random() > 0.35)) {
      return canWin.sort((a, b) => RANK_VALUE[a.rank] - RANK_VALUE[b.rank])[0];
    }
    return leadCards.sort((a, b) => RANK_VALUE[a.rank] - RANK_VALUE[b.rank])[0];
  }

  const winTrumps = cwCard && cwCard.suit === trumpSuit
    ? trumpCards.filter((c) => RANK_VALUE[c.rank] > RANK_VALUE[cwCard.rank]) : trumpCards;

  if ((isDeclarer || currentWinnerId !== botSeat) && winTrumps.length > 0) {
    return winTrumps.sort((a, b) => RANK_VALUE[a.rank] - RANK_VALUE[b.rank])[0];
  }
  const nonTrump = discard.filter((c) => c.suit !== trumpSuit);
  return nonTrump.length > 0 ? nonTrump[0] : discard[0];
}
