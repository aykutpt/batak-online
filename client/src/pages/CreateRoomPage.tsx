import { useState } from 'react';
import { Link } from 'react-router-dom';
import { GameMode } from '@shared/types';
import { useOnlineGame } from '../context/OnlineGameContext';

export default function CreateRoomPage() {
  const { createRoom, state } = useOnlineGame();
  const [name, setName] = useState('');
  const [mode, setMode] = useState<GameMode>('score_limit');
  const [scoreLimit, setScoreLimit] = useState(40);
  const [roundLimit, setRoundLimit] = useState(10);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createRoom(name.trim(), { mode, scoreLimit, roundLimit });
  };

  return (
    <div className="min-h-screen bg-felt flex items-center justify-center p-4">
      <div className="bg-felt-dark border border-white/20 rounded-2xl shadow-2xl w-full max-w-md p-8 text-white">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/" className="text-white/60 hover:text-white transition-colors">← Geri</Link>
          <h1 className="text-2xl font-bold">Oda Kur</h1>
        </div>

        {state.error && (
          <div className="bg-red-600/30 border border-red-500/50 text-red-300 rounded-xl p-3 mb-4 text-sm">
            {state.error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">Adın</label>
            <input
              type="text" value={name} onChange={(e) => setName(e.target.value)}
              maxLength={16} required
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:border-yellow-400"
              placeholder="Adını gir"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Oyun Modu</label>
            <div className="grid grid-cols-2 gap-3">
              {(['score_limit', 'round_limit'] as GameMode[]).map((m) => (
                <button key={m} type="button" onClick={() => setMode(m)}
                  className={`p-3 rounded-xl border-2 text-sm font-semibold transition-all
                    ${mode === m ? 'border-yellow-400 bg-yellow-400/20 text-yellow-300' : 'border-white/20 bg-white/5 text-white/70 hover:border-white/40'}`}>
                  {m === 'score_limit' ? '🎯 Puan Limiti' : '🔄 Tur Limiti'}
                </button>
              ))}
            </div>
          </div>

          {mode === 'score_limit' && (
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Kazanma Puanı</label>
              <div className="flex gap-2">
                {[30, 40, 50].map((v) => (
                  <button key={v} type="button" onClick={() => setScoreLimit(v)}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${scoreLimit === v ? 'bg-yellow-400 text-gray-900' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
          )}

          {mode === 'round_limit' && (
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Tur Sayısı</label>
              <div className="flex gap-2">
                {[5, 10, 20].map((v) => (
                  <button key={v} type="button" onClick={() => setRoundLimit(v)}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${roundLimit === v ? 'bg-yellow-400 text-gray-900' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                    {v} Tur
                  </button>
                ))}
              </div>
            </div>
          )}

          <button type="submit"
            disabled={!name.trim() || !state.connected}
            className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors text-lg">
            {state.connected ? 'Oda Kur' : 'Bağlanıyor…'}
          </button>
        </form>
      </div>
    </div>
  );
}
