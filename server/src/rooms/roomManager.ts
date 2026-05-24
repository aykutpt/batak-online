import { v4 as uuidv4 } from 'uuid';
import { Seat, GameConfig, GamePhase, RoomSummary, RoomPlayerSummary } from '@shared/types';
import { SEATS } from '@shared/gameRules';
import { ServerRoom, ServerPlayer } from '../types/server';

const rooms = new Map<string, ServerRoom>();

// Clean up inactive rooms every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (now - room.lastActivityAt > 60 * 60 * 1000) { // 1 hour
      rooms.delete(code);
    }
  }
}, 10 * 60 * 1000);

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  do {
    code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (rooms.has(code));
  return code;
}

export function createRoom(hostSocketId: string, hostName: string, config: GameConfig): { room: ServerRoom; hostPlayer: ServerPlayer } {
  const code = generateRoomCode();
  const hostId = uuidv4();

  const hostPlayer: ServerPlayer = {
    playerId: hostId,
    socketId: hostSocketId,
    name: hostName,
    seat: 'south',
    isBot: false,
    isConnected: true,
    isReady: false,
    hand: [],
    tricksWon: 0,
    totalScore: 0,
  };

  const seatMap = new Map<Seat, string | null>(SEATS.map((s) => [s, null]));
  seatMap.set('south', hostId);

  const room: ServerRoom = {
    code,
    hostId,
    players: new Map([[hostId, hostPlayer]]),
    seatMap,
    phase: 'lobby',
    gameState: null,
    config,
    createdAt: Date.now(),
    lastActivityAt: Date.now(),
  };

  rooms.set(code, room);
  return { room, hostPlayer };
}

export function getRoom(code: string): ServerRoom | undefined {
  return rooms.get(code.toUpperCase());
}

export function deleteRoom(code: string): void {
  rooms.delete(code);
}

export function touchRoom(code: string): void {
  const room = rooms.get(code);
  if (room) room.lastActivityAt = Date.now();
}

export function addPlayerToRoom(
  room: ServerRoom,
  socketId: string,
  playerName: string,
): ServerPlayer {
  const playerId = uuidv4();
  const player: ServerPlayer = {
    playerId,
    socketId,
    name: playerName,
    seat: 'south', // temporary — will be overwritten by selectSeat
    isBot: false,
    isConnected: true,
    isReady: false,
    hand: [],
    tricksWon: 0,
    totalScore: 0,
  };
  room.players.set(playerId, player);
  room.lastActivityAt = Date.now();
  return player;
}

export function addBotToRoom(room: ServerRoom, seat: Seat): ServerPlayer | null {
  if (room.seatMap.get(seat) !== null) return null;
  const botId = `bot-${uuidv4()}`;
  const botNames: Record<Seat, string> = {
    south: 'Bot Güney', west: 'Bot Batı', north: 'Bot Kuzey', east: 'Bot Doğu',
  };
  const bot: ServerPlayer = {
    playerId: botId,
    socketId: '',
    name: botNames[seat],
    seat,
    isBot: true,
    isConnected: true,
    isReady: true,
    hand: [],
    tricksWon: 0,
    totalScore: 0,
  };
  room.players.set(botId, bot);
  room.seatMap.set(seat, botId);
  room.lastActivityAt = Date.now();
  return bot;
}

export function removePlayerFromRoom(room: ServerRoom, playerId: string): void {
  const player = room.players.get(playerId);
  if (!player) return;
  room.seatMap.set(player.seat, null);
  room.players.delete(playerId);
  // Transfer host if needed
  if (room.hostId === playerId) {
    const nextHuman = [...room.players.values()].find((p) => !p.isBot);
    room.hostId = nextHuman?.playerId ?? '';
  }
  room.lastActivityAt = Date.now();
}

export function getPlayerBySocketId(room: ServerRoom, socketId: string): ServerPlayer | undefined {
  return [...room.players.values()].find((p) => p.socketId === socketId);
}

export function getPlayerAtSeat(room: ServerRoom, seat: Seat): ServerPlayer | undefined {
  const playerId = room.seatMap.get(seat);
  if (!playerId) return undefined;
  return room.players.get(playerId);
}

export function isSeatAvailable(room: ServerRoom, seat: Seat): boolean {
  return room.seatMap.get(seat) === null;
}

export function getAllRooms(): Map<string, ServerRoom> {
  return rooms;
}

export function getRoomSummaries(limit = 100): RoomSummary[] {
  const result: RoomSummary[] = [];
  for (const room of rooms.values()) {
    if (result.length >= limit) break;
    const players: RoomPlayerSummary[] = [];
    for (const seat of SEATS) {
      const playerId = room.seatMap.get(seat);
      if (playerId) {
        const player = room.players.get(playerId);
        if (player) players.push({ name: player.name, seat, isBot: player.isBot });
      }
    }
    result.push({
      code: room.code,
      phase: room.phase === 'lobby' ? 'lobby' : 'playing',
      players,
      availableSeats: SEATS.filter((s) => room.seatMap.get(s) === null).length,
    });
  }
  return result;
}

export function countHumanPlayers(room: ServerRoom): number {
  return [...room.players.values()].filter((p) => !p.isBot && p.isConnected).length;
}

export function areAllSeatsReady(room: ServerRoom): boolean {
  const filledSeats = [...room.seatMap.entries()].filter(([, id]) => id !== null);
  if (filledSeats.length !== 4) return false;
  for (const [, playerId] of filledSeats) {
    const player = room.players.get(playerId!);
    if (!player || (!player.isReady && !player.isBot)) return false;
  }
  return true;
}

export function resetPlayersForNewRound(room: ServerRoom): void {
  for (const player of room.players.values()) {
    player.hand = [];
    player.tricksWon = 0;
  }
}
