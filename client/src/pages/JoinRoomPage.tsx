import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useOnlineGame } from '../context/OnlineGameContext';

export default function JoinRoomPage() {
  const { code: urlCode } = useParams<{ code?: string }>();
  const { joinRoom, state } = useOnlineGame();
  const [name, setName] = useState('');
  const [code, setCode] = useState(urlCode ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;
    joinRoom(name.trim(), code.trim().toUpperCase());
  };

  return (
    <div className="min-h-screen bg-felt flex items-center justify-center p-4">
      <div className="bg-felt-dark border border-white/20 rounded-2xl shadow-2xl w-full max-w-md p-8 text-white">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/" className="text-white/60 hover:text-white transition-colors">← Geri</Link>
          <h1 className="text-2xl font-bold">Odaya Katıl</h1>
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
            <label className="block text-sm font-medium text-white/80 mb-1">Oda Kodu</label>
            <input
              type="text" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={6} required
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:border-yellow-400 uppercase font-mono text-lg tracking-widest"
              placeholder="XXXXXX"
            />
          </div>

          <button type="submit"
            disabled={!name.trim() || !code.trim() || !state.connected}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors text-lg">
            {state.connected ? 'Odaya Katıl' : 'Bağlanıyor…'}
          </button>
        </form>
      </div>
    </div>
  );
}
