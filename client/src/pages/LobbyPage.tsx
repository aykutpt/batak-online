import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Seat } from '@shared/types';
import { useOnlineGame } from '../context/OnlineGameContext';
import LobbyTable from '../components/LobbyTable';

export default function LobbyPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { state, selectSeat, setReady, addBot, removeBot, startGame, leaveRoom, clearError } = useOnlineGame();
  const [copied, setCopied] = useState(false);

  // Navigate to game when game starts
  useEffect(() => {
    if (state.gameState && state.gameState.phase !== 'lobby') {
      navigate(`/game/${code}`, { replace: true });
    }
  }, [state.gameState]);

  const inviteLink = `${window.location.origin}/join/${code}`;

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!state.lobby && !state.roomCode) {
    return (
      <div className="min-h-screen bg-felt flex items-center justify-center">
        <p className="text-white">Yükleniyor…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-felt flex items-center justify-center p-4">
      <div className="bg-felt-dark border border-white/20 rounded-2xl shadow-2xl w-full max-w-md p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold">Lobi</h1>
            <p className="text-white/60 text-sm">Oda: <span className="font-mono font-bold text-yellow-300">{code}</span></p>
          </div>
          <button onClick={leaveRoom} className="text-white/50 hover:text-white text-sm transition-colors">
            Ayrıl
          </button>
        </div>

        {state.error && (
          <div className="bg-red-600/30 border border-red-500/50 text-red-300 rounded-xl p-3 mb-4 text-sm flex justify-between items-center">
            <span>{state.error}</span>
            <button onClick={clearError} className="text-red-300 hover:text-white ml-2">✕</button>
          </div>
        )}

        {/* Invite link */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 mb-4">
          <p className="text-white/60 text-xs mb-1">Davet Linki</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs text-white/80 truncate">{inviteLink}</code>
            <button onClick={copyLink}
              className="text-xs px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors flex-shrink-0">
              {copied ? '✓ Kopyalandı' : 'Kopyala'}
            </button>
          </div>
        </div>

        {state.lobby ? (
          <LobbyTable
            lobby={state.lobby}
            myPlayerId={state.playerId ?? ''}
            onSelectSeat={(seat: Seat) => selectSeat(seat)}
            onAddBot={(seat: Seat) => addBot(seat)}
            onRemoveBot={(seat: Seat) => removeBot(seat)}
            onSetReady={setReady}
            onStartGame={startGame}
          />
        ) : (
          <p className="text-white/60 text-center py-4">Lobi yükleniyor…</p>
        )}
      </div>
    </div>
  );
}
