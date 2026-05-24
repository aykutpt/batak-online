import { Card, Suit, Rank, PlayedCard, Seat } from '@shared/types';
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
    if (suitLengths[suit] === 0) score -= 0.25;
  }
  return Math.round(score);
}

export function chooseBotTrump(hand: Card[]): Suit {
  const suitScore: Record<Suit, number> = { spades: 0, hearts: 0, diamonds: 0, clubs: 0 };
  for (const card of hand) {
    suitScore[card.suit] += RANK_VALUE[card.rank] + 1;
  }
  return (Object.entries(suitScore) as [Suit, number][]).sort((a, b) => b[1] - a[1])[0][0];
}

export function chooseBotCard(
  hand: Card[],
  leadSuit: Suit | null,
  trumpSuit: Suit,
  trickCards: PlayedCard[],
  botSeat: Seat,
  isDeclarer: boolean,
): Card {
  const legal = getLegalCards(hand, leadSuit);
  if (legal.length === 1) return legal[0];

  const currentWinnerId =
    trickCards.length > 0 && leadSuit
      ? determineTrickWinner(trickCards, leadSuit, trumpSuit)
      : null;

  if (!leadSuit) return chooseLeadCard(legal, trumpSuit, isDeclarer);
  return chooseFollowCard(legal, leadSuit, trumpSuit, trickCards, currentWinnerId, botSeat, isDeclarer);
}

function chooseLeadCard(legal: Card[], trumpSuit: Suit, isDeclarer: boolean): Card {
  if (isDeclarer) {
    const nonTrump = legal.filter((c) => c.suit !== trumpSuit);
    const pool = nonTrump.length > 0 ? nonTrump : legal;
    const highCards = pool.filter((c) => HIGH_RANKS.includes(c.rank));
    if (highCards.length > 0) {
      return highCards.sort((a, b) => RANK_VALUE[b.rank] - RANK_VALUE[a.rank])[0];
    }
    return pool.sort((a, b) => RANK_VALUE[b.rank] - RANK_VALUE[a.rank])[0];
  }
  const sorted = [...legal].sort((a, b) => RANK_VALUE[a.rank] - RANK_VALUE[b.rank]);
  return sorted[Math.floor(sorted.length / 2)];
}

function chooseFollowCard(
  legal: Card[],
  leadSuit: Suit,
  trumpSuit: Suit,
  trickCards: PlayedCard[],
  currentWinnerId: Seat | null,
  botSeat: Seat,
  isDeclarer: boolean,
): Card {
  const currentWinnerCard = trickCards.find((tc) => tc.seat === currentWinnerId)?.card;
  const leadSuitCards = legal.filter((c) => c.suit === leadSuit);
  const trumpCards = legal.filter((c) => c.suit === trumpSuit);
  const discard = [...legal].sort((a, b) => RANK_VALUE[a.rank] - RANK_VALUE[b.rank]);

  if (leadSuitCards.length > 0) {
    const canWin =
      currentWinnerCard && currentWinnerCard.suit === leadSuit
        ? leadSuitCards.filter((c) => RANK_VALUE[c.rank] > RANK_VALUE[currentWinnerCard.rank])
        : leadSuitCards;

    if (canWin.length > 0 && (isDeclarer || Math.random() > 0.35)) {
      return canWin.sort((a, b) => RANK_VALUE[a.rank] - RANK_VALUE[b.rank])[0];
    }
    return leadSuitCards.sort((a, b) => RANK_VALUE[a.rank] - RANK_VALUE[b.rank])[0];
  }

  // No lead suit — may trump or discard
  const winningTrumps =
    currentWinnerCard && currentWinnerCard.suit === trumpSuit
      ? trumpCards.filter((c) => RANK_VALUE[c.rank] > RANK_VALUE[currentWinnerCard.rank])
      : trumpCards;

  if ((isDeclarer || currentWinnerId !== botSeat) && winningTrumps.length > 0) {
    return winningTrumps.sort((a, b) => RANK_VALUE[a.rank] - RANK_VALUE[b.rank])[0];
  }

  const nonTrumpDiscard = discard.filter((c) => c.suit !== trumpSuit);
  return nonTrumpDiscard.length > 0 ? nonTrumpDiscard[0] : discard[0];
}
