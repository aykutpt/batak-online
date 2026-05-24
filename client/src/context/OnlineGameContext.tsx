import {
  createContext, useContext, useReducer, useEffect, useCallback, ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LobbyState, PublicGameState, Card, GamePhase, BidValue, Suit,
  RoomCreatedPayload, RoomJoinedPayload, PrivateHandPayload,
} from '@shared/types';
import { socket, connectSocket } from '../socket/socket';

// ─── State ────────────────────────────────────────────────────────────────────

interface OnlineState {
  connected: boolean;
  playerId: string | null;
  roomCode: string | null;
  lobby: LobbyState | null;
  gameState: PublicGameState | null;
  myHand: Card[];
  error: string | null;
  statusMessage: string | null;
}

const initial: OnlineState = {
  connected: false,
  playerId: null,
  roomCode: null,
  lobby: null,
  gameState: null,
  myHand: [],
  error: null,
  statusMessage: null,
};

type StateAction =
  | { type: 'CONNECTED' }
  | { type: 'DISCONNECTED' }
  | { type: 'ROOM_JOINED'; playerId: string; roomCode: string; lobby: LobbyState }
  | { type: 'LOBBY_UPDATED'; lobby: LobbyState }
  | { type: 'GAME_STARTED' }
  | { type: 'GAME_STATE_UPDATED'; gameState: PublicGameState }
  | { type: 'HAND_UPDATED'; hand: Card[] }
  | { type: 'ERROR'; message: string }
  | { type: 'STATUS'; message: string | null }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RESET' };

function stateReducer(state: OnlineState, action: StateAction): OnlineState {
  switch (action.type) {
    case 'CONNECTED': return { ...state, connected: true, error: null };
    case 'DISCONNECTED': return { ...state, connected: false };
    case 'ROOM_JOINED':
      return { ...state, playerId: action.playerId, roomCode: action.roomCode, lobby: action.lobby, gameState: null, myHand: [] };
    case 'LOBBY_UPDATED': return { ...state, lobby: action.lobby };
    case 'GAME_STARTED': return { ...state, lobby: null };
    case 'GAME_STATE_UPDATED': return { ...state, gameState: action.gameState };
    case 'HAND_UPDATED': return { ...state, myHand: action.hand };
    case 'ERROR': return { ...state, error: action.message };
    case 'STATUS': return { ...state, statusMessage: action.message };
    case 'CLEAR_ERROR': return { ...state, error: null };
    case 'RESET': return { ...initial, connected: state.connected };
    default: return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface OnlineGameContextValue {
  state: OnlineState;
  createRoom: (playerName: string, config: { mode: string; scoreLimit: number; roundLimit: number }) => void;
  joinRoom: (playerName: string, roomCode: string) => void;
  selectSeat: (seat: string) => void;
  setReady: (ready: boolean) => void;
  addBot: (seat: string) => void;
  removeBot: (seat: string) => void;
  startGame: () => void;
  placeBid: (value: BidValue) => void;
  selectTrump: (suit: Suit) => void;
  playCard: (cardId: string) => void;
  startNextRound: () => void;
  restartGame: () => void;
  leaveRoom: () => void;
  clearError: () => void;
  mySeat: string | null;
}

const OnlineGameContext = createContext<OnlineGameContextValue | null>(null);

export function OnlineGameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(stateReducer, initial);
  const navigate = useNavigate();

  // ─── Socket lifecycle ───────────────────────────────────────────────────────

  useEffect(() => {
    connectSocket();

    socket.on('connect', () => dispatch({ type: 'CONNECTED' }));
    socket.on('disconnect', () => dispatch({ type: 'DISCONNECTED' }));

    socket.on('roomCreated', (payload: RoomCreatedPayload) => {
      localStorage.setItem('batak_playerId', payload.playerId);
      localStorage.setItem('batak_roomCode', payload.roomCode);
      dispatch({ type: 'ROOM_JOINED', playerId: payload.playerId, roomCode: payload.roomCode, lobby: payload.lobby });
      navigate(`/lobby/${payload.roomCode}`);
    });

    socket.on('roomJoined', (payload: RoomJoinedPayload) => {
      localStorage.setItem('batak_playerId', payload.playerId);
      localStorage.setItem('batak_roomCode', payload.roomCode);
      dispatch({ type: 'ROOM_JOINED', playerId: payload.playerId, roomCode: payload.roomCode, lobby: payload.lobby });
      navigate(`/lobby/${payload.roomCode}`);
    });

    socket.on('roomUpdated', (lobby: LobbyState) => {
      dispatch({ type: 'LOBBY_UPDATED', lobby });
    });

    socket.on('gameStarted', () => {
      dispatch({ type: 'GAME_STARTED' });
    });

    socket.on('gameStateUpdated', (gameState: PublicGameState) => {
      dispatch({ type: 'GAME_STATE_UPDATED', gameState });
      if (gameState.phase !== 'lobby') {
        const roomCode = localStorage.getItem('batak_roomCode');
        if (roomCode) navigate(`/game/${roomCode}`, { replace: true });
      }
    });

    socket.on('privateHandUpdated', (payload: PrivateHandPayload) => {
      dispatch({ type: 'HAND_UPDATED', hand: payload.hand });
    });

    socket.on('trickCompleted', () => {
      // Public gameState update follows shortly — no extra action needed
    });

    socket.on('playerDisconnected', (data: { playerName: string }) => {
      dispatch({ type: 'STATUS', message: `${data.playerName} bağlantısı koptu` });
      setTimeout(() => dispatch({ type: 'STATUS', message: null }), 4000);
    });

    socket.on('playerReconnected', (data: { playerName: string }) => {
      dispatch({ type: 'STATUS', message: `${data.playerName} yeniden bağlandı` });
      setTimeout(() => dispatch({ type: 'STATUS', message: null }), 3000);
    });

    socket.on('reconnected', (payload: { roomCode: string; playerId: string; gameState: PublicGameState }) => {
      localStorage.setItem('batak_playerId', payload.playerId);
      localStorage.setItem('batak_roomCode', payload.roomCode);
      dispatch({ type: 'ROOM_JOINED', playerId: payload.playerId, roomCode: payload.roomCode, lobby: null as unknown as LobbyState });
      dispatch({ type: 'GAME_STATE_UPDATED', gameState: payload.gameState });
      navigate(`/game/${payload.roomCode}`, { replace: true });
    });

    socket.on('roomDeleted', () => {
      localStorage.removeItem('batak_playerId');
      localStorage.removeItem('batak_roomCode');
      dispatch({ type: 'RESET' });
      navigate('/');
    });

    socket.on('errorMessage', (payload: { message: string }) => {
      dispatch({ type: 'ERROR', message: payload.message });
    });

    // Try to reconnect if we have saved credentials
    const savedId = localStorage.getItem('batak_playerId');
    const savedCode = localStorage.getItem('batak_roomCode');
    if (savedId && savedCode) {
      socket.emit('reconnectPlayer', { playerId: savedId, roomCode: savedCode });
    }

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('roomCreated');
      socket.off('roomJoined');
      socket.off('roomUpdated');
      socket.off('gameStarted');
      socket.off('gameStateUpdated');
      socket.off('privateHandUpdated');
      socket.off('trickCompleted');
      socket.off('playerDisconnected');
      socket.off('playerReconnected');
      socket.off('reconnected');
      socket.off('roomDeleted');
      socket.off('errorMessage');
    };
  }, []);

  // ─── Actions ──────────────────────────────────────────────────────────────

  const createRoom = useCallback((playerName: string, config: { mode: string; scoreLimit: number; roundLimit: number }) => {
    socket.emit('createRoom', { playerName, config });
  }, []);

  const joinRoom = useCallback((playerName: string, roomCode: string) => {
    socket.emit('joinRoom', { playerName, roomCode: roomCode.toUpperCase() });
  }, []);

  const selectSeat = useCallback((seat: string) => {
    socket.emit('selectSeat', { seat });
  }, []);

  const setReady = useCallback((ready: boolean) => {
    socket.emit('setReady', { ready });
  }, []);

  const addBot = useCallback((seat: string) => {
    socket.emit('addBot', { seat });
  }, []);

  const removeBot = useCallback((seat: string) => {
    socket.emit('removeBot', { seat });
  }, []);

  const startGame = useCallback(() => {
    socket.emit('startGame');
  }, []);

  const placeBid = useCallback((value: BidValue) => {
    socket.emit('placeBid', { value });
  }, []);

  const selectTrump = useCallback((suit: Suit) => {
    socket.emit('selectTrump', { suit });
  }, []);

  const playCard = useCallback((cardId: string) => {
    socket.emit('playCard', { cardId });
  }, []);

  const startNextRound = useCallback(() => {
    socket.emit('startNextRound');
  }, []);

  const restartGame = useCallback(() => {
    socket.emit('restartGame');
    dispatch({ type: 'RESET' });
    navigate('/');
  }, []);

  const leaveRoom = useCallback(() => {
    socket.emit('leaveRoom');
    localStorage.removeItem('batak_playerId');
    localStorage.removeItem('batak_roomCode');
    dispatch({ type: 'RESET' });
    navigate('/');
  }, []);

  const clearError = useCallback(() => dispatch({ type: 'CLEAR_ERROR' }), []);

  const mySeat = state.gameState?.players.find((p) => p.playerId === state.playerId)?.seat
    ?? state.lobby?.seats.find((s) => s.player?.playerId === state.playerId)?.seat
    ?? null;

  return (
    <OnlineGameContext.Provider value={{
      state, createRoom, joinRoom, selectSeat, setReady, addBot, removeBot,
      startGame, placeBid, selectTrump, playCard, startNextRound, restartGame,
      leaveRoom, clearError, mySeat,
    }}>
      {children}
    </OnlineGameContext.Provider>
  );
}

export function useOnlineGame(): OnlineGameContextValue {
  const ctx = useContext(OnlineGameContext);
  if (!ctx) throw new Error('useOnlineGame must be used within OnlineGameProvider');
  return ctx;
}
