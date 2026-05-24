import {
  Card, Seat, Suit, BidValue, PlayedCard, PublicGameState, PublicPlayerInfo, GamePhase, GameConfig,
} from '@shared/types';
import {
  SEATS, createDeck, shuffleDeck, dealCards, sortHand, getLegalCards,
  isLegalMove, determineTrickWinner, validateBid, getNextSeat,
  calculateRoundScore, checkGameEnd,
} from '@shared/gameRules';

// ─── Local player model ───────────────────────────────────────────────────────

export interface OfflinePlayer {
  playerId: string;
  name: string;
  seat: Seat;
  isBot: boolean;
  hand: Card[];
  tricksWon: number;
  totalScore: number;
}

export interface OfflineState {
  phase: GamePhase;
  config: GameConfig;
  players: Record<Seat, OfflinePlayer>;
  currentRound: number;
  dealerSeat: Seat;
  bids: { seat: Seat; value: BidValue }[];
  currentBidderSeat: Seat | null;
  highestBid: number;
  highestBidderSeat: Seat | null;
  declarerSeat: Seat | null;
  trumpSuit: Suit | null;
  currentTrick: PlayedCard[];
  leadSuit: Suit | null;
  currentTurnSeat: Seat | null;
  roundResults: ReturnType<typeof calculateRoundScore>[];
  totalScores: Record<Seat, number>;
  illegalMoveMessage: string;
}

export function buildInitialOfflineState(
  humanName: string,
  config: GameConfig,
): OfflineState {
  const zeroes = Object.fromEntries(SEATS.map((s) => [s, 0])) as Record<Seat, number>;
  return {
    phase: 'dealing',
    config,
    players: {
      south: { playerId: 'human', name: humanName, seat: 'south', isBot: false, hand: [], tricksWon: 0, totalScore: 0 },
      west: { playerId: 'bot-west', name: 'Batı', seat: 'west', isBot: true, hand: [], tricksWon: 0, totalScore: 0 },
      north: { playerId: 'bot-north', name: 'Kuzey', seat: 'north', isBot: true, hand: [], tricksWon: 0, totalScore: 0 },
      east: { playerId: 'bot-east', name: 'Doğu', seat: 'east', isBot: true, hand: [], tricksWon: 0, totalScore: 0 },
    },
    currentRound: 1,
    dealerSeat: 'east',
    bids: [],
    currentBidderSeat: null,
    highestBid: 0,
    highestBidderSeat: null,
    declarerSeat: null,
    trumpSuit: null,
    currentTrick: [],
    leadSuit: null,
    currentTurnSeat: null,
    roundResults: [],
    totalScores: zeroes,
    illegalMoveMessage: '',
  };
}

/** Build a PublicGameState shape for the shared GameTable component */
export function toPublicGameState(state: OfflineState): PublicGameState {
  const players: PublicPlayerInfo[] = SEATS.map((seat) => {
    const p = state.players[seat];
    return {
      playerId: p.playerId,
      name: p.name,
      seat,
      isBot: p.isBot,
      isConnected: true,
      cardCount: p.hand.length,
      tricksWon: p.tricksWon,
      totalScore: p.totalScore,
    };
  });
  return {
    phase: state.phase,
    currentRound: state.currentRound,
    dealerSeat: state.dealerSeat,
    bids: state.bids,
    currentBidderSeat: state.currentBidderSeat,
    highestBid: state.highestBid,
    highestBidderSeat: state.highestBidderSeat,
    declarerSeat: state.declarerSeat,
    trumpSuit: state.trumpSuit,
    currentTrick: state.currentTrick,
    leadSuit: state.leadSuit,
    currentTurnSeat: state.currentTurnSeat,
    roundResults: state.roundResults,
    players,
    config: state.config,
  };
}

// ─── State transitions (pure) ─────────────────────────────────────────────────

export function dealRound(state: OfflineState): OfflineState {
  const deck = shuffleDeck(createDeck());
  const hands = dealCards(deck);
  const firstBidder = getNextSeat(state.dealerSeat);

  const players = { ...state.players };
  for (const seat of SEATS) {
    players[seat] = {
      ...players[seat],
      hand: seat === 'south' ? sortHand(hands[seat]) : hands[seat],
      tricksWon: 0,
      totalScore: state.totalScores[seat] ?? 0,
    };
  }

  return {
    ...state,
    phase: 'bidding',
    players,
    bids: [],
    currentBidderSeat: firstBidder,
    highestBid: 0,
    highestBidderSeat: null,
    declarerSeat: null,
    trumpSuit: null,
    currentTrick: [],
    leadSuit: null,
    currentTurnSeat: null,
    illegalMoveMessage: '',
  };
}

export function applyBid(state: OfflineState, seat: Seat, value: BidValue): OfflineState {
  const { valid } = validateBid(value, state.highestBid);
  if (!valid && value !== 'pass') return state;

  const newBids = [...state.bids, { seat, value }];
  let newHighest = state.highestBid;
  let newHighestSeat = state.highestBidderSeat;

  if (value !== 'pass' && (value as number) > state.highestBid) {
    newHighest = value as number;
    newHighestSeat = seat;
  }

  if (newBids.length < 4) {
    return { ...state, bids: newBids, currentBidderSeat: getNextSeat(seat), highestBid: newHighest, highestBidderSeat: newHighestSeat };
  }

  // All 4 bids in
  if (!newHighestSeat) {
    // Everyone passed — redeal
    return dealRound({ ...state, bids: [], currentBidderSeat: null });
  }

  return {
    ...state,
    bids: newBids,
    phase: 'trump_selection',
    declarerSeat: newHighestSeat,
    currentBidderSeat: null,
    highestBid: newHighest,
    highestBidderSeat: newHighestSeat,
  };
}

export function applyTrump(state: OfflineState, suit: Suit): OfflineState {
  return {
    ...state,
    phase: 'playing',
    trumpSuit: suit,
    currentTurnSeat: state.declarerSeat,
    currentTrick: [],
    leadSuit: null,
    illegalMoveMessage: '',
  };
}

export function applyPlayCard(
  state: OfflineState,
  seat: Seat,
  cardId: string,
): { state: OfflineState; error?: string } {
  const player = state.players[seat];
  const card = player.hand.find((c) => c.id === cardId);
  if (!card) return { state, error: 'Kart bulunamadı.' };

  if (!player.isBot) {
    const { legal, reason } = isLegalMove(card, player.hand, state.leadSuit);
    if (!legal) return { state: { ...state, illegalMoveMessage: reason ?? 'Geçersiz hamle.' }, error: reason };
  }

  const newHand = player.hand.filter((c) => c.id !== cardId);
  const newTrick: PlayedCard[] = [...state.currentTrick, { seat, card, order: state.currentTrick.length }];
  const newLeadSuit = state.leadSuit ?? card.suit;
  const nextTurn = getNextSeat(seat);

  const updatedPlayers = {
    ...state.players,
    [seat]: { ...player, hand: newHand },
  };

  if (newTrick.length < 4) {
    return {
      state: {
        ...state,
        players: updatedPlayers,
        currentTrick: newTrick,
        leadSuit: newLeadSuit,
        currentTurnSeat: nextTurn,
        illegalMoveMessage: '',
      },
    };
  }

  // 4 cards played — resolve trick
  const winnerSeat = determineTrickWinner(newTrick, newLeadSuit, state.trumpSuit!);
  const updatedWithWin = {
    ...updatedPlayers,
    [winnerSeat]: { ...updatedPlayers[winnerSeat], tricksWon: updatedPlayers[winnerSeat].tricksWon + 1 },
  };

  const totalTricks = SEATS.reduce((s, seat) => s + updatedWithWin[seat].tricksWon, 0);

  if (totalTricks < 13) {
    return {
      state: {
        ...state,
        players: updatedWithWin,
        currentTrick: newTrick, // show for animation
        leadSuit: newLeadSuit,
        currentTurnSeat: winnerSeat,
        phase: 'playing' as GamePhase,
        illegalMoveMessage: '',
        // trick will be cleared by caller after animation delay
      },
    };
  }

  // Round over
  const tricksWon = Object.fromEntries(SEATS.map((s) => [s, updatedWithWin[s].tricksWon])) as Record<Seat, number>;
  const result = calculateRoundScore({
    tricksWon,
    declarerSeat: state.declarerSeat!,
    bidAmount: state.highestBid,
    trumpSuit: state.trumpSuit!,
    round: state.currentRound,
    currentTotalScores: state.totalScores,
  });

  const finalPlayers = { ...updatedWithWin };
  for (const s of SEATS) {
    finalPlayers[s] = { ...finalPlayers[s], totalScore: result.totalScores[s] };
  }

  const gameEnds = checkGameEnd(result.totalScores, state.config, state.currentRound);

  return {
    state: {
      ...state,
      players: finalPlayers,
      currentTrick: newTrick,
      leadSuit: newLeadSuit,
      phase: gameEnds ? 'game_over' : 'round_summary',
      roundResults: [...state.roundResults, result],
      totalScores: result.totalScores,
      illegalMoveMessage: '',
    },
  };
}

export function clearCurrentTrick(state: OfflineState, nextLeader: Seat): OfflineState {
  return { ...state, currentTrick: [], leadSuit: null, currentTurnSeat: nextLeader };
}

export function startNextOfflineRound(state: OfflineState): OfflineState {
  return dealRound({
    ...state,
    currentRound: state.currentRound + 1,
    dealerSeat: getNextSeat(state.dealerSeat),
    phase: 'dealing',
  });
}
