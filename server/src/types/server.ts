import { Card, Seat, GamePhase, Suit, Bid, PlayedCard, RoundResult, GameConfig } from '@shared/types';

export interface ServerPlayer {
  playerId: string;
  socketId: string;
  name: string;
  seat: Seat;
  isBot: boolean;
  isConnected: boolean;
  isReady: boolean;
  hand: Card[];
  tricksWon: number;
  totalScore: number;
}

export interface ServerGameState {
  phase: GamePhase;
  currentRound: number;
  dealerSeat: Seat;
  bids: Bid[];
  currentBidderSeat: Seat | null;
  highestBid: number;
  highestBidderSeat: Seat | null;
  declarerSeat: Seat | null;
  trumpSuit: Suit | null;
  currentTrick: PlayedCard[];
  leadSuit: Suit | null;
  currentTurnSeat: Seat | null;
  roundResults: RoundResult[];
  totalScores: Record<Seat, number>;
}

export interface ServerRoom {
  code: string;
  hostId: string;
  /** playerId → ServerPlayer */
  players: Map<string, ServerPlayer>;
  /** seat → playerId | null */
  seatMap: Map<Seat, string | null>;
  phase: GamePhase;
  gameState: ServerGameState | null;
  config: GameConfig;
  createdAt: number;
  lastActivityAt: number;
}
