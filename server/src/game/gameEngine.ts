import { Server } from 'socket.io';
import { Seat, Suit, BidValue, PlayedCard, PublicGameState, PublicPlayerInfo, LobbyState, LobbySeat } from '@shared/types';
import {
  SEATS, createDeck, shuffleDeck, dealCards, sortHand, getLegalCards,
  isLegalMove, determineTrickWinner, validateBid, getNextSeat,
  calculateRoundScore, checkGameEnd,
} from '@shared/gameRules';
import { ServerRoom, ServerPlayer } from '../types/server';
import { getPlayerAtSeat, resetPlayersForNewRound, getRoom } from '../rooms/roomManager';
import { estimateBotBid, chooseBotTrump, chooseBotCard } from './botAI';

const BOT_DELAY_MS = 900;

// ─── State Builders ───────────────────────────────────────────────────────────

export function buildLobbyState(room: ServerRoom): LobbyState {
  const seats: LobbySeat[] = SEATS.map((seat) => {
    const playerId = room.seatMap.get(seat);
    if (!playerId) return { seat, player: null };
    const player = room.players.get(playerId);
    if (!player) return { seat, player: null };
    return {
      seat,
      player: {
        playerId: player.playerId,
        name: player.name,
        isBot: player.isBot,
        isReady: player.isReady,
        isConnected: player.isConnected,
      },
    };
  });
  return { roomCode: room.code, hostId: room.hostId, config: room.config, seats };
}

export function buildPublicGameState(room: ServerRoom): PublicGameState {
  const gs = room.gameState!;
  const players: PublicPlayerInfo[] = [];

  for (const seat of SEATS) {
    const playerId = room.seatMap.get(seat);
    if (!playerId) continue;
    const player = room.players.get(playerId);
    if (!player) continue;
    players.push({
      playerId: player.playerId,
      name: player.name,
      seat: player.seat,
      isBot: player.isBot,
      isConnected: player.isConnected,
      cardCount: player.hand.length,
      tricksWon: player.tricksWon,
      totalScore: player.totalScore,
    });
  }

  return {
    phase: gs.phase,
    currentRound: gs.currentRound,
    dealerSeat: gs.dealerSeat,
    bids: gs.bids,
    currentBidderSeat: gs.currentBidderSeat,
    highestBid: gs.highestBid,
    highestBidderSeat: gs.highestBidderSeat,
    declarerSeat: gs.declarerSeat,
    trumpSuit: gs.trumpSuit,
    currentTrick: gs.currentTrick,
    leadSuit: gs.leadSuit,
    currentTurnSeat: gs.currentTurnSeat,
    roundResults: gs.roundResults,
    players,
    config: room.config,
  };
}

// ─── Broadcasts ───────────────────────────────────────────────────────────────

export function broadcastLobby(io: Server, room: ServerRoom): void {
  io.to(room.code).emit('roomUpdated', buildLobbyState(room));
}

export function broadcastGameState(io: Server, room: ServerRoom): void {
  io.to(room.code).emit('gameStateUpdated', buildPublicGameState(room));
}

export function sendPrivateHand(io: Server, _room: ServerRoom, player: ServerPlayer): void {
  if (player.isBot || !player.socketId) return;
  io.to(player.socketId).emit('privateHandUpdated', { hand: player.hand });
}

export function sendPrivateHandToAll(io: Server, room: ServerRoom): void {
  for (const player of room.players.values()) {
    sendPrivateHand(io, room, player);
  }
}

// ─── Game Start ───────────────────────────────────────────────────────────────

export function startGame(io: Server, room: ServerRoom): void {
  const dealerSeat: Seat = 'east'; // east deals first; bidding starts south
  const totalScores = {} as Record<Seat, number>;
  for (const seat of SEATS) totalScores[seat] = 0;

  room.gameState = {
    phase: 'dealing',
    currentRound: 1,
    dealerSeat,
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
    totalScores,
  };
  room.phase = 'dealing';

  dealRound(io, room);
}

// ─── Round Setup ─────────────────────────────────────────────────────────────

function dealRound(io: Server, room: ServerRoom): void {
  const gs = room.gameState!;
  resetPlayersForNewRound(room);

  const deck = shuffleDeck(createDeck());
  const hands = dealCards(deck);

  for (const seat of SEATS) {
    const player = getPlayerAtSeat(room, seat);
    if (player) {
      player.hand = !player.isBot ? sortHand(hands[seat]) : hands[seat];
      player.totalScore = gs.totalScores[seat] ?? 0;
    }
  }

  const firstBidder = getNextSeat(gs.dealerSeat);

  gs.phase = 'bidding';
  gs.bids = [];
  gs.currentBidderSeat = firstBidder;
  gs.highestBid = 0;
  gs.highestBidderSeat = null;
  gs.declarerSeat = null;
  gs.trumpSuit = null;
  gs.currentTrick = [];
  gs.leadSuit = null;
  gs.currentTurnSeat = null;
  room.phase = 'bidding';

  broadcastGameState(io, room);
  sendPrivateHandToAll(io, room);

  scheduleBotBid(io, room);
}

// ─── Bidding ──────────────────────────────────────────────────────────────────

export function handleBid(
  io: Server,
  room: ServerRoom,
  player: ServerPlayer,
  value: BidValue,
): string | null {
  const gs = room.gameState!;
  if (gs.phase !== 'bidding') return 'Şu an ihale aşamasında değiliz.';
  if (gs.currentBidderSeat !== player.seat) return 'Sıra sende değil.';

  const { valid, reason } = validateBid(value, gs.highestBid);
  if (!valid) return reason ?? 'Geçersiz ihale.';

  gs.bids.push({ seat: player.seat, value });

  if (value !== 'pass') {
    gs.highestBid = value as number;
    gs.highestBidderSeat = player.seat;
  }

  const nextBidder = getNextSeat(player.seat);
  const bidsCount = gs.bids.length;

  if (bidsCount < 4) {
    gs.currentBidderSeat = nextBidder;
    broadcastGameState(io, room);
    scheduleBotBid(io, room);
    return null;
  }

  // All 4 bids placed
  if (!gs.highestBidderSeat) {
    // Everyone passed — redeal
    gs.currentRound = gs.currentRound; // keep round number
    broadcastGameState(io, room);
    setTimeout(() => dealRound(io, room), 1200);
    return null;
  }

  // Move to trump selection
  gs.phase = 'trump_selection';
  gs.declarerSeat = gs.highestBidderSeat;
  gs.currentBidderSeat = null;
  room.phase = 'trump_selection';

  broadcastGameState(io, room);

  // If bot is declarer, auto-select trump
  const declarer = getPlayerAtSeat(room, gs.declarerSeat);
  if (declarer?.isBot) {
    setTimeout(() => {
      const currentRoom = getRoom(room.code);
      if (!currentRoom || currentRoom.gameState?.phase !== 'trump_selection') return;
      const trump = chooseBotTrump(declarer.hand);
      handleTrumpSelection(io, currentRoom, declarer, trump);
    }, BOT_DELAY_MS);
  }

  return null;
}

// ─── Trump Selection ──────────────────────────────────────────────────────────

export function handleTrumpSelection(
  io: Server,
  room: ServerRoom,
  player: ServerPlayer,
  suit: Suit,
): string | null {
  const gs = room.gameState!;
  if (gs.phase !== 'trump_selection') return 'Koz seçim aşamasında değiliz.';
  if (gs.declarerSeat !== player.seat) return 'Sadece ihale kazananı koz seçebilir.';

  gs.trumpSuit = suit;
  gs.phase = 'playing';
  gs.currentTurnSeat = gs.declarerSeat;
  room.phase = 'playing';

  broadcastGameState(io, room);
  scheduleBotPlay(io, room);
  return null;
}

// ─── Card Play ────────────────────────────────────────────────────────────────

export function handlePlayCard(
  io: Server,
  room: ServerRoom,
  player: ServerPlayer,
  cardId: string,
): string | null {
  const gs = room.gameState!;
  if (gs.phase !== 'playing') return 'Şu an oynama aşamasında değiliz.';
  if (gs.currentTurnSeat !== player.seat) return 'Sıra sende değil.';

  const card = player.hand.find((c) => c.id === cardId);
  if (!card) return 'Bu kart elinde yok.';

  const { legal, reason } = isLegalMove(card, player.hand, gs.leadSuit);
  if (!legal) return reason ?? 'Geçersiz hamle.';

  // Remove card from hand
  player.hand = player.hand.filter((c) => c.id !== cardId);

  const playedCard: PlayedCard = {
    seat: player.seat,
    card,
    order: gs.currentTrick.length,
  };
  gs.currentTrick.push(playedCard);

  if (!gs.leadSuit) gs.leadSuit = card.suit;

  broadcastGameState(io, room);
  sendPrivateHand(io, room, player);

  if (gs.currentTrick.length === 4) {
    // Resolve trick after brief delay
    setTimeout(() => resolveTrick(io, room), 1400);
  } else {
    gs.currentTurnSeat = getNextSeat(player.seat);
    broadcastGameState(io, room);
    scheduleBotPlay(io, room);
  }

  return null;
}

// ─── Trick Resolution ────────────────────────────────────────────────────────

function resolveTrick(io: Server, room: ServerRoom): void {
  const gs = room.gameState!;
  if (!gs.leadSuit || !gs.trumpSuit) return;

  const winnerSeat = determineTrickWinner(gs.currentTrick, gs.leadSuit, gs.trumpSuit);
  const winner = getPlayerAtSeat(room, winnerSeat);
  if (winner) winner.tricksWon++;

  io.to(room.code).emit('trickCompleted', { winnerSeat, trick: gs.currentTrick });

  gs.currentTrick = [];
  gs.leadSuit = null;

  // Count total tricks won
  const totalTricks = SEATS.reduce((sum, s) => {
    const p = getPlayerAtSeat(room, s);
    return sum + (p?.tricksWon ?? 0);
  }, 0);

  if (totalTricks === 13) {
    endRound(io, room);
    return;
  }

  gs.currentTurnSeat = winnerSeat;
  broadcastGameState(io, room);
  scheduleBotPlay(io, room);
}

// ─── Round End ───────────────────────────────────────────────────────────────

function endRound(io: Server, room: ServerRoom): void {
  const gs = room.gameState!;

  const tricksWon = {} as Record<Seat, number>;
  for (const seat of SEATS) {
    tricksWon[seat] = getPlayerAtSeat(room, seat)?.tricksWon ?? 0;
  }

  const result = calculateRoundScore({
    tricksWon,
    declarerSeat: gs.declarerSeat!,
    bidAmount: gs.highestBid,
    trumpSuit: gs.trumpSuit!,
    round: gs.currentRound,
    currentTotalScores: gs.totalScores,
  });

  gs.roundResults.push(result);
  gs.totalScores = result.totalScores;

  // Sync totalScore into each player for display
  for (const seat of SEATS) {
    const player = getPlayerAtSeat(room, seat);
    if (player) player.totalScore = result.totalScores[seat];
  }

  if (checkGameEnd(gs.totalScores, room.config, gs.currentRound)) {
    gs.phase = 'game_over';
    room.phase = 'game_over';
  } else {
    gs.phase = 'round_summary';
    room.phase = 'round_summary';
  }

  broadcastGameState(io, room);
}

// ─── Next Round ───────────────────────────────────────────────────────────────

export function startNextRound(io: Server, room: ServerRoom): string | null {
  const gs = room.gameState!;
  if (gs.phase !== 'round_summary') return 'Şu an tur özeti aşamasında değiliz.';

  gs.currentRound++;
  gs.dealerSeat = getNextSeat(gs.dealerSeat);
  gs.phase = 'dealing';

  dealRound(io, room);
  return null;
}

// ─── Restart Game ─────────────────────────────────────────────────────────────

export function restartGame(io: Server, room: ServerRoom): void {
  for (const player of room.players.values()) {
    player.totalScore = 0;
    player.tricksWon = 0;
  }
  room.gameState = null;
  room.phase = 'lobby';

  // Reset ready states
  for (const player of room.players.values()) {
    if (!player.isBot) player.isReady = false;
  }

  broadcastLobby(io, room);
}

// ─── Bot Scheduling ───────────────────────────────────────────────────────────

function scheduleBotBid(io: Server, room: ServerRoom): void {
  const gs = room.gameState;
  if (!gs || gs.phase !== 'bidding' || !gs.currentBidderSeat) return;

  const player = getPlayerAtSeat(room, gs.currentBidderSeat);
  if (!player?.isBot) return;

  setTimeout(() => {
    const currentRoom = getRoom(room.code);
    if (!currentRoom?.gameState || currentRoom.gameState.phase !== 'bidding') return;
    const bot = getPlayerAtSeat(currentRoom, currentRoom.gameState.currentBidderSeat!);
    if (!bot?.isBot) return;

    const estimate = estimateBotBid(bot.hand);
    const minBid = Math.max(5, currentRoom.gameState.highestBid + 1);
    const canBid = estimate >= minBid && minBid <= 13;
    const bidValue: BidValue = canBid ? (estimate as BidValue) : 'pass';
    handleBid(io, currentRoom, bot, bidValue);
  }, BOT_DELAY_MS);
}

function scheduleBotPlay(io: Server, room: ServerRoom): void {
  const gs = room.gameState;
  if (!gs || gs.phase !== 'playing' || !gs.currentTurnSeat) return;

  const player = getPlayerAtSeat(room, gs.currentTurnSeat);
  if (!player?.isBot) return;

  setTimeout(() => {
    const currentRoom = getRoom(room.code);
    if (!currentRoom?.gameState || currentRoom.gameState.phase !== 'playing') return;
    const bot = getPlayerAtSeat(currentRoom, currentRoom.gameState.currentTurnSeat!);
    if (!bot?.isBot) return;

    const gs2 = currentRoom.gameState;
    const legal = getLegalCards(bot.hand, gs2.leadSuit);
    const card = chooseBotCard(
      bot.hand,
      gs2.leadSuit,
      gs2.trumpSuit!,
      gs2.currentTrick,
      bot.seat,
      bot.seat === gs2.declarerSeat,
    );
    const safeCard = legal.find((c) => c.id === card.id) ?? legal[0];
    handlePlayCard(io, currentRoom, bot, safeCard.id);
  }, BOT_DELAY_MS);
}

