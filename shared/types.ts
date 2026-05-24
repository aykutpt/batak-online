// ─── Core Game Types ──────────────────────────────────────────────────────────

export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type Rank = 'A' | 'K' | 'Q' | 'J' | '10' | '9' | '8' | '7' | '6' | '5' | '4' | '3' | '2';
export type Seat = 'south' | 'west' | 'north' | 'east';
export type BidValue = 'pass' | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;
export type GameMode = 'score_limit' | 'round_limit';
export type GamePhase =
  | 'lobby'
  | 'dealing'
  | 'bidding'
  | 'trump_selection'
  | 'playing'
  | 'round_summary'
  | 'game_over';

export interface Card {
  suit: Suit;
  rank: Rank;
  id: string;
}

export interface GameConfig {
  mode: GameMode;
  scoreLimit: number;
  roundLimit: number;
}

export interface Bid {
  seat: Seat;
  value: BidValue;
}

export interface PlayedCard {
  seat: Seat;
  card: Card;
  order: number;
}

export interface RoundResult {
  round: number;
  declarerSeat: Seat;
  bidAmount: number;
  trumpSuit: Suit;
  tricksWon: Record<Seat, number>;
  pointsGained: Record<Seat, number>;
  declarerSucceeded: boolean;
  totalScores: Record<Seat, number>;
}

// ─── Public State (safe to send to all clients) ───────────────────────────────

export interface PublicPlayerInfo {
  playerId: string;
  name: string;
  seat: Seat;
  isBot: boolean;
  isConnected: boolean;
  cardCount: number;
  tricksWon: number;
  totalScore: number;
}

export interface PublicGameState {
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
  players: PublicPlayerInfo[];
  config: GameConfig;
}

// ─── Lobby State ──────────────────────────────────────────────────────────────

export interface LobbyPlayer {
  playerId: string;
  name: string;
  isBot: boolean;
  isReady: boolean;
  isConnected: boolean;
}

export interface LobbySeat {
  seat: Seat;
  player: LobbyPlayer | null;
}

export interface LobbyState {
  roomCode: string;
  hostId: string;
  config: GameConfig;
  seats: LobbySeat[];
}

// ─── Room Browser ─────────────────────────────────────────────────────────────

export interface RoomPlayerSummary {
  name: string;
  seat: Seat;
  isBot: boolean;
}

export interface RoomSummary {
  code: string;
  phase: 'lobby' | 'playing';
  players: RoomPlayerSummary[];
  availableSeats: number;
}

// ─── Socket.IO Payloads — Client → Server ─────────────────────────────────────

export interface CreateRoomPayload {
  playerName: string;
  config: GameConfig;
}

export interface JoinRoomPayload {
  playerName: string;
  roomCode: string;
}

export interface SelectSeatPayload {
  seat: Seat;
}

export interface AddBotPayload {
  seat: Seat;
}

export interface RemoveBotPayload {
  seat: Seat;
}

export interface PlaceBidPayload {
  value: BidValue;
}

export interface SelectTrumpPayload {
  suit: Suit;
}

export interface PlayCardPayload {
  cardId: string;
}

export interface ReconnectPayload {
  playerId: string;
  roomCode: string;
}

// ─── Socket.IO Payloads — Server → Client ─────────────────────────────────────

export interface RoomCreatedPayload {
  roomCode: string;
  playerId: string;
  lobby: LobbyState;
}

export interface RoomJoinedPayload {
  roomCode: string;
  playerId: string;
  lobby: LobbyState;
}

export interface PrivateHandPayload {
  hand: Card[];
}

export interface ErrorPayload {
  message: string;
}

export interface TrickCompletedPayload {
  winnerSeat: Seat;
  trick: PlayedCard[];
}
