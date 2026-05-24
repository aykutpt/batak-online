import { PublicPlayerInfo } from '@shared/types';

export default function GameOver({ players, onRestart }: { players: PublicPlayerInfo[]; onRestart: () => void }) {
  const sorted = [...players].sort((a, b) => b.totalScore - a.totalScore);
  return (
    <div className="min-h-screen bg-felt flex items-center justify-center p-4">
      <div className="bg-felt-dark border border-white/20 rounded-2xl shadow-2xl w-full max-w-md p-8 text-white">
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">🏆</div>
          <h1 className="text-3xl font-bold">Oyun Bitti</h1>
        </div>
        <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-xl p-4 mb-5 text-center">
          <p className="text-yellow-300 text-sm uppercase font-semibold mb-1">Kazanan</p>
          <p className="text-2xl font-bold">{sorted[0].name}</p>
          <p className="text-yellow-300 text-xl font-bold">{sorted[0].totalScore} puan</p>
        </div>
        <div className="space-y-2 mb-6">
          {sorted.map((p, i) => (
            <div key={p.playerId} className={`flex justify-between p-3 rounded-xl ${i===0?'bg-yellow-500/20 border border-yellow-500/30':'bg-white/5 border border-white/10'}`}>
              <span className="font-semibold">{i+1}. {p.name}</span>
              <span className={`font-bold ${p.totalScore<0?'text-red-400':i===0?'text-yellow-300':'text-green-300'}`}>{p.totalScore}</span>
            </div>
          ))}
        </div>
        <button onClick={onRestart} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition-colors text-lg">
          Oyunu Yeniden Başlat
        </button>
      </div>
    </div>
  );
}
