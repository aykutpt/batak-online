import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { BidValue, Suit, GameConfig } from '@shared/types';
import { getLegalCards } from '@shared/gameRules';
import {
  OfflineState, buildInitialOfflineState, dealRound, applyBid, applyTrump,
  applyPlayCard, clearCurrentTrick, startNextOfflineRound, toPublicGameState,
} from '../game/offlineEngine';
import { estimateBotBid, chooseBotTrump, chooseBotCard } from '../game/offlineBotAI';
import GameTable from '../components/GameTable';
import GameOver from '../components/GameOver';

const DEFAULT_CONFIG: GameConfig = { mode: 'score_limit', scoreLimit: 500, roundLimit: 10 };

function Setup({ onStart }: { onStart: (name: string, config: GameConfig) => void }) {
  const [name, setName] = useState('');
  const [mode, setMode] = useState<'score_limit' | 'round_limit'>('score_limit');
  const [scoreLimit, setScoreLimit] = useState(500);
  const [roundLimit, setRoundLimit] = useState(10);

  return (
    <div className="min-h-screen bg-felt flex items-center justify-center p-4">
      <div className="bg-felt-dark border border-white/20 rounded-2xl shadow-2xl w-full max-w-sm p-8 text-white">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/" className="text-white/60 hover:text-white">← Geri</Link>
          <h1 className="text-xl font-bold">🤖 Botlara Karşı Oyna</h1>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-white/80 mb-1">Adın</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={16}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:border-yellow-400"
              placeholder="Adını gir" />
          </div>
          <div>
            <label className="block text-sm text-white/80 mb-2">Mod</label>
            <div className="grid grid-cols-2 gap-2">
              {(['score_limit','round_limit'] as const).map((m) => (
                <button key={m} onClick={() => setMode(m)}
                  className={`p-2 rounded-xl border-2 text-xs font-semibold transition-all ${mode===m?'border-yellow-400 bg-yellow-400/20 text-yellow-300':'border-white/20 text-white/70 hover:border-white/40'}`}>
                  {m === 'score_limit' ? '🎯 Puan Limiti' : '🔄 Tur Limiti'}
                </button>
              ))}
            </div>
          </div>
          {mode === 'score_limit' && (
            <div className="flex gap-2">
              {[300,500,1000].map((v) => <button key={v} onClick={() => setScoreLimit(v)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${scoreLimit===v?'bg-yellow-400 text-gray-900':'bg-white/10 text-white hover:bg-white/20'}`}>{v}</button>)}
            </div>
          )}
          {mode === 'round_limit' && (
            <div className="flex gap-2">
              {[5,10,20].map((v) => <button key={v} onClick={() => setRoundLimit(v)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${roundLimit===v?'bg-yellow-400 text-gray-900':'bg-white/10 text-white hover:bg-white/20'}`}>{v} Tur</button>)}
            </div>
          )}
          <button onClick={() => name.trim() && onStart(name.trim(), { mode, scoreLimit, roundLimit })}
            disabled={!name.trim()}
            className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors text-lg">
            Oyuna Başla
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PracticePage() {
  const [gameState, setGameState] = useState<OfflineState | null>(null);
  const [pendingTrickClear, setPendingTrickClear] = useState<string | null>(null); // winnerSeat
  const [illegalMsg, setIllegalMsg] = useState('');

  const start = (name: string, config: GameConfig) => {
    const initial = buildInitialOfflineState(name, config);
    setGameState(dealRound(initial));
  };

  const update = useCallback((next: OfflineState) => setGameState(next), []);

  // Bot bidding
  useEffect(() => {
    if (!gameState || gameState.phase !== 'bidding') return;
    const seat = gameState.currentBidderSeat;
    if (!seat || !gameState.players[seat].isBot) return;

    const t = setTimeout(() => {
      setGameState((prev) => {
        if (!prev || prev.phase !== 'bidding' || prev.currentBidderSeat !== seat) return prev;
        const estimate = estimateBotBid(prev.players[seat].hand);
        const minBid = Math.max(5, prev.highestBid + 1);
        const canBid = estimate >= minBid && minBid <= 13;
        return applyBid(prev, seat, canBid ? estimate as BidValue : 'pass');
      });
    }, 850);
    return () => clearTimeout(t);
  }, [gameState?.phase, gameState?.currentBidderSeat]);

  // Bot trump selection
  useEffect(() => {
    if (!gameState || gameState.phase !== 'trump_selection') return;
    const seat = gameState.declarerSeat;
    if (!seat || !gameState.players[seat].isBot) return;

    const t = setTimeout(() => {
      setGameState((prev) => {
        if (!prev || prev.phase !== 'trump_selection' || prev.declarerSeat !== seat) return prev;
        return applyTrump(prev, chooseBotTrump(prev.players[seat].hand));
      });
    }, 700);
    return () => clearTimeout(t);
  }, [gameState?.phase, gameState?.declarerSeat]);

  // Bot card play
  useEffect(() => {
    if (!gameState || gameState.phase !== 'playing') return;
    const seat = gameState.currentTurnSeat;
    if (!seat || !gameState.players[seat].isBot) return;

    const t = setTimeout(() => {
      setGameState((prev) => {
        if (!prev || prev.phase !== 'playing' || prev.currentTurnSeat !== seat) return prev;
        const player = prev.players[seat];
        const legal = getLegalCards(player.hand, prev.leadSuit);
        const card = chooseBotCard(player.hand, prev.leadSuit, prev.trumpSuit!, prev.currentTrick, seat, seat === prev.declarerSeat);
        const safeCard = legal.find((c) => c.id === card.id) ?? legal[0];
        const { state: next } = applyPlayCard(prev, seat, safeCard.id);
        return next;
      });
    }, 700);
    return () => clearTimeout(t);
  }, [gameState?.phase, gameState?.currentTurnSeat, gameState?.currentTrick.length]);

  // Clear trick after delay
  useEffect(() => {
    if (!gameState) return;
    const trick = gameState.currentTrick;
    if (trick.length !== 4) return;
    if (gameState.phase !== 'playing') return; // round ended, don't clear

    const winnerSeat = gameState.currentTurnSeat; // set to winner by applyPlayCard
    if (!winnerSeat) return;

    const t = setTimeout(() => {
      setGameState((prev) => {
        if (!prev || prev.currentTrick.length !== 4) return prev;
        return clearCurrentTrick(prev, prev.currentTurnSeat!);
      });
    }, 1400);
    return () => clearTimeout(t);
  }, [gameState?.currentTrick.length, gameState?.phase]);

  const handleCard = (card: { id: string }) => {
    if (!gameState) return;
    const { state: next, error } = applyPlayCard(gameState, 'south', card.id);
    if (error) {
      setIllegalMsg(error);
      setTimeout(() => setIllegalMsg(''), 3000);
    }
    setGameState(next);
  };

  const handleBid = (value: BidValue) => {
    if (!gameState) return;
    setGameState(applyBid(gameState, 'south', value));
  };

  const handleTrump = (suit: Suit) => {
    if (!gameState) return;
    setGameState(applyTrump(gameState, suit));
  };

  const handleNextRound = () => {
    if (!gameState) return;
    setGameState(startNextOfflineRound(gameState));
  };

  const handleRestart = () => {
    setGameState(null);
  };

  if (!gameState) return <Setup onStart={start} />;

  const publicState = toPublicGameState(gameState);

  if (gameState.phase === 'game_over') {
    return <GameOver players={publicState.players} onRestart={handleRestart} />;
  }

  return (
    <GameTable
      gameState={publicState}
      myHand={gameState.players.south.hand}
      mySeat="south"
      hostId="human"
      myPlayerId="human"
      illegalMoveMessage={illegalMsg}
      onCardClick={handleCard}
      onBid={handleBid}
      onTrumpSelect={handleTrump}
      onNextRound={handleNextRound}
    />
  );
}
