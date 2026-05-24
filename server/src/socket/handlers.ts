import { Server, Socket } from 'socket.io';
import {
  CreateRoomPayload, JoinRoomPayload, SelectSeatPayload, AddBotPayload, RemoveBotPayload,
  PlaceBidPayload, SelectTrumpPayload, PlayCardPayload, ReconnectPayload,
} from '@shared/types';
import { SEATS } from '@shared/gameRules';
import * as roomManager from '../rooms/roomManager';
import {
  buildLobbyState, buildPublicGameState, broadcastLobby, broadcastGameState,
  sendPrivateHand, startGame, handleBid, handleTrumpSelection,
  handlePlayCard, startNextRound, restartGame,
} from '../game/gameEngine';

function sendError(socket: Socket, message: string): void {
  socket.emit('errorMessage', { message });
}

function broadcastRoomList(io: Server): void {
  io.to('room-browser').emit('roomListData', roomManager.getRoomSummaries(100));
}

export function registerHandlers(io: Server, socket: Socket): void {

  // ─── Oda Listesi (Room Browser) ────────────────────────────────────────────

  socket.on('subscribeRoomList', () => {
    socket.join('room-browser');
    socket.emit('roomListData', roomManager.getRoomSummaries(100));
  });

  socket.on('unsubscribeRoomList', () => {
    socket.leave('room-browser');
  });

  // ─── Room Management ───────────────────────────────────────────────────────

  socket.on('createRoom', (payload: CreateRoomPayload) => {
    const { playerName, config } = payload;
    if (!playerName?.trim()) return sendError(socket, 'Oyuncu adı gerekli.');

    const { room, hostPlayer } = roomManager.createRoom(socket.id, playerName.trim(), config);
    socket.join(room.code);

    socket.emit('roomCreated', {
      roomCode: room.code,
      playerId: hostPlayer.playerId,
      lobby: buildLobbyState(room),
    });
    broadcastRoomList(io);
  });

  socket.on('joinRoom', (payload: JoinRoomPayload) => {
    const { playerName, roomCode } = payload;
    if (!playerName?.trim()) return sendError(socket, 'Oyuncu adı gerekli.');
    if (!roomCode?.trim()) return sendError(socket, 'Oda kodu gerekli.');

    const room = roomManager.getRoom(roomCode.trim().toUpperCase());
    if (!room) return sendError(socket, 'Oda bulunamadı.');
    if (room.phase !== 'lobby') return sendError(socket, 'Oyun zaten başladı.');
    if (roomManager.countHumanPlayers(room) >= 4) return sendError(socket, 'Oda dolu.');

    const player = roomManager.addPlayerToRoom(room, socket.id, playerName.trim());
    socket.join(room.code);

    socket.emit('roomJoined', {
      roomCode: room.code,
      playerId: player.playerId,
      lobby: buildLobbyState(room),
    });
    broadcastLobby(io, room);
    broadcastRoomList(io);
  });

  socket.on('reconnectPlayer', (payload: ReconnectPayload) => {
    const { playerId, roomCode } = payload;
    const room = roomManager.getRoom(roomCode);
    if (!room) return sendError(socket, 'Oda bulunamadı.');

    const player = room.players.get(playerId);
    if (!player) return sendError(socket, 'Oyuncu bulunamadı.');

    player.socketId = socket.id;
    player.isConnected = true;
    socket.join(room.code);

    if (room.phase === 'lobby') {
      socket.emit('roomJoined', {
        roomCode: room.code,
        playerId: player.playerId,
        lobby: buildLobbyState(room),
      });
      broadcastLobby(io, room);
    } else {
      socket.emit('reconnected', {
        roomCode: room.code,
        playerId: player.playerId,
        gameState: buildPublicGameState(room),
      });
      sendPrivateHand(io, room, player);
      socket.to(room.code).emit('playerReconnected', { playerName: player.name, seat: player.seat });
    }
  });

  socket.on('leaveRoom', () => {
    const room = findRoomBySocket(socket.id);
    if (!room) return;
    const player = roomManager.getPlayerBySocketId(room, socket.id);
    if (!player) return;

    roomManager.removePlayerFromRoom(room, player.playerId);
    socket.leave(room.code);

    if (room.players.size === 0) {
      roomManager.deleteRoom(room.code);
    } else {
      broadcastLobby(io, room);
    }
    broadcastRoomList(io);
  });

  // ─── Lobby ────────────────────────────────────────────────────────────────

  socket.on('selectSeat', (payload: SelectSeatPayload) => {
    const room = findRoomBySocket(socket.id);
    if (!room || room.phase !== 'lobby') return sendError(socket, 'Koltuk seçimi şu an mümkün değil.');

    const player = roomManager.getPlayerBySocketId(room, socket.id);
    if (!player) return sendError(socket, 'Oyuncu bulunamadı.');

    if (!SEATS.includes(payload.seat)) return sendError(socket, 'Geçersiz koltuk.');
    if (!roomManager.isSeatAvailable(room, payload.seat)) return sendError(socket, 'Bu koltuk dolu.');

    // Vacate old seat
    if (room.seatMap.get(player.seat) === player.playerId) {
      room.seatMap.set(player.seat, null);
    }
    player.seat = payload.seat;
    room.seatMap.set(payload.seat, player.playerId);

    broadcastLobby(io, room);
  });

  socket.on('setReady', (payload: { ready: boolean }) => {
    const room = findRoomBySocket(socket.id);
    if (!room || room.phase !== 'lobby') return;
    const player = roomManager.getPlayerBySocketId(room, socket.id);
    if (!player || player.isBot) return;
    player.isReady = payload.ready;
    broadcastLobby(io, room);
  });

  socket.on('addBot', (payload: AddBotPayload) => {
    const room = findRoomBySocket(socket.id);
    if (!room || room.phase !== 'lobby') return sendError(socket, 'Şu an bot eklenemiyor.');
    if (!roomManager.isSeatAvailable(room, payload.seat)) return sendError(socket, 'Bu koltuk dolu.');

    roomManager.addBotToRoom(room, payload.seat);
    broadcastLobby(io, room);
  });

  socket.on('removeBot', (payload: RemoveBotPayload) => {
    const room = findRoomBySocket(socket.id);
    if (!room || room.phase !== 'lobby') return;
    const player = roomManager.getPlayerBySocketId(room, socket.id);
    if (!player || player.playerId !== room.hostId) return;

    const botId = room.seatMap.get(payload.seat);
    if (!botId) return;
    const bot = room.players.get(botId);
    if (!bot?.isBot) return;

    roomManager.removePlayerFromRoom(room, botId);
    broadcastLobby(io, room);
  });

  socket.on('startGame', () => {
    const room = findRoomBySocket(socket.id);
    if (!room || room.phase !== 'lobby') return sendError(socket, 'Oyun başlatılamıyor.');
    const player = roomManager.getPlayerBySocketId(room, socket.id);
    if (!player || player.playerId !== room.hostId) return sendError(socket, 'Sadece oda sahibi oyunu başlatabilir.');

    const filledSeats = [...room.seatMap.values()].filter((id) => id !== null).length;
    if (filledSeats < 4) return sendError(socket, 'Tüm koltuklara oyuncu gerekiyor (bot veya insan).');
    if (!roomManager.areAllSeatsReady(room)) return sendError(socket, 'Tüm oyuncular hazır olmalı.');

    io.to(room.code).emit('gameStarted', buildLobbyState(room));
    startGame(io, room);
    broadcastRoomList(io);
  });

  // ─── Game Actions ─────────────────────────────────────────────────────────

  socket.on('placeBid', (payload: PlaceBidPayload) => {
    const room = findRoomBySocket(socket.id);
    if (!room) return sendError(socket, 'Oda bulunamadı.');
    const player = roomManager.getPlayerBySocketId(room, socket.id);
    if (!player) return sendError(socket, 'Oyuncu bulunamadı.');

    const error = handleBid(io, room, player, payload.value);
    if (error) sendError(socket, error);
  });

  socket.on('selectTrump', (payload: SelectTrumpPayload) => {
    const room = findRoomBySocket(socket.id);
    if (!room) return sendError(socket, 'Oda bulunamadı.');
    const player = roomManager.getPlayerBySocketId(room, socket.id);
    if (!player) return sendError(socket, 'Oyuncu bulunamadı.');

    const error = handleTrumpSelection(io, room, player, payload.suit);
    if (error) sendError(socket, error);
  });

  socket.on('playCard', (payload: PlayCardPayload) => {
    const room = findRoomBySocket(socket.id);
    if (!room) return sendError(socket, 'Oda bulunamadı.');
    const player = roomManager.getPlayerBySocketId(room, socket.id);
    if (!player) return sendError(socket, 'Oyuncu bulunamadı.');

    const error = handlePlayCard(io, room, player, payload.cardId);
    if (error) sendError(socket, error);
  });

  socket.on('startNextRound', () => {
    const room = findRoomBySocket(socket.id);
    if (!room) return;
    const player = roomManager.getPlayerBySocketId(room, socket.id);
    if (!player || player.playerId !== room.hostId) return sendError(socket, 'Sadece oda sahibi yeni tur başlatabilir.');

    const error = startNextRound(io, room);
    if (error) sendError(socket, error);
  });

  socket.on('restartGame', () => {
    const room = findRoomBySocket(socket.id);
    if (!room) return;
    const player = roomManager.getPlayerBySocketId(room, socket.id);
    if (!player || player.playerId !== room.hostId) return;
    restartGame(io, room);
  });

  socket.on('deleteRoom', ({ code }: { code: string }) => {
    const room = roomManager.getRoom(code?.toUpperCase());
    if (!room) return;
    io.to(room.code).emit('roomDeleted');
    roomManager.deleteRoom(room.code);
    broadcastRoomList(io);
  });

  socket.on('requestGameState', () => {
    const room = findRoomBySocket(socket.id);
    if (!room) return;
    const player = roomManager.getPlayerBySocketId(room, socket.id);
    if (!player) return;

    if (room.phase === 'lobby') {
      socket.emit('roomUpdated', buildLobbyState(room));
    } else {
      socket.emit('gameStateUpdated', buildPublicGameState(room));
      sendPrivateHand(io, room, player);
    }
  });

  // ─── Disconnect ────────────────────────────────────────────────────────────

  socket.on('disconnect', () => {
    const room = findRoomBySocket(socket.id);
    if (!room) return;
    const player = roomManager.getPlayerBySocketId(room, socket.id);
    if (!player) return;

    player.isConnected = false;
    socket.to(room.code).emit('playerDisconnected', { playerName: player.name, seat: player.seat });

    if (room.phase === 'lobby') {
      // Remove from lobby if they haven't selected a seat
      if (room.seatMap.get(player.seat) !== player.playerId) {
        room.players.delete(player.playerId);
      }
      broadcastLobby(io, room);
      broadcastRoomList(io);
    } else {
      broadcastGameState(io, room);
    }

    // Clean up empty rooms after timeout
    setTimeout(() => {
      const currentRoom = roomManager.getRoom(room.code);
      if (!currentRoom) return;
      const connectedHumans = [...currentRoom.players.values()].filter(
        (p) => !p.isBot && p.isConnected,
      );
      if (connectedHumans.length === 0) {
        roomManager.deleteRoom(room.code);
      }
    }, 5 * 60 * 1000); // 5 minutes
  });
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function findRoomBySocket(socketId: string) {
  for (const room of roomManager.getAllRooms().values()) {
    if (roomManager.getPlayerBySocketId(room, socketId)) return room;
  }
  return null;
}
