import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BidValue, Suit, Seat } from '@shared/types';
import { useOnlineGame } from '../context/OnlineGameContext';
import GameTable from '../components/GameTable';
import GameOver from '../components/GameOver';

export default function GamePage() {
  const navigate = useNavigate();
  const { state, playCard, placeBid, selectTrump, startNextRound, restartGame, leaveRoom } = useOnlineGame();
  const [illegalMsg, setIllegalMsg] = useState('');

  const { gameState, myHand, playerId, lobby } = state;
  const { mySeat } = useOnlineGame();

  useEffect(() => {
    if (!gameState && !state.roomCode) navigate('/', { replace: true });
  }, [gameState, state.roomCode]);

  // Show error messages from server briefly
  useEffect(() => {
    if (state.error) {
      setIllegalMsg(state.error);
      const t = setTimeout(() => setIllegalMsg(''), 3500);
      return () => clearTimeout(t);
    }
  }, [state.error]);

  if (!gameState) {
    return (
      <div className="min-h-screen bg-felt flex items-center justify-center">
        <p className="text-white">Oyun yükleniyor…</p>
      </div>
    );
  }

  if (gameState.phase === 'game_over') {
    const sorted = [...gameState.players].sort((a, b) => b.totalScore - a.totalScore);
    const winner = sorted[0];
    const isHost = playerId === lobby?.hostId;
    return (
      <div className="min-h-screen bg-felt flex items-center justify-center p-4">
        <div className="bg-felt-dark border border-white/20 rounded-2xl shadow-2xl w-full max-w-md p-8 text-white">
          <div className="text-center mb-6">
            <div className="text-5xl mb-2">🏆</div>
            <h1 className="text-3xl font-bold mb-1">Oyun Bitti</h1>
          </div>
          <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-xl p-4 mb-5 text-center">
            <p className="text-yellow-300 text-sm uppercase font-semibold mb-1">Kazanan</p>
            <p className="text-2xl font-bold">{winner.name}</p>
            <p className="text-yellow-300 text-xl font-bold">{winner.totalScore} puan</p>
          </div>
          <div className="space-y-2 mb-6">
            {sorted.map((p, i) => (
              <div key={p.playerId} className={`flex justify-between p-3 rounded-xl ${i === 0 ? 'bg-yellow-500/20 border border-yellow-500/30' : 'bg-white/5 border border-white/10'}`}>
                <span className="font-semibold">{i+1}. {p.name}</span>
                <span className={`font-bold ${p.totalScore < 0 ? 'text-red-400' : i === 0 ? 'text-yellow-300' : 'text-green-300'}`}>{p.totalScore}</span>
              </div>
            ))}
          </div>
          {isHost ? (
            <button onClick={restartGame} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition-colors">
              Oyunu Yeniden Başlat
            </button>
          ) : (
            <p className="text-center text-white/60 mb-3">Oda sahibi oyunu yeniden başlatacak…</p>
          )}
          <button onClick={leaveRoom} className="w-full bg-white/10 hover:bg-white/20 text-white font-semibold py-2 rounded-xl transition-colors mt-2">
            Ana Menüye Dön
          </button>
        </div>
      </div>
    );
  }

  const hostId = lobby?.hostId ?? null;

  return (
    <GameTable
      gameState={gameState}
      myHand={myHand}
      mySeat={mySeat as Seat | null}
      hostId={hostId}
      myPlayerId={playerId}
      illegalMoveMessage={illegalMsg}
      statusMessage={state.statusMessage ?? undefined}
      onCardClick={(card) => playCard(card.id)}
      onBid={(v: BidValue) => placeBid(v)}
      onTrumpSelect={(s: Suit) => selectTrump(s)}
      onNextRound={startNextRound}
      onLeave={leaveRoom}
    />
  );
}
