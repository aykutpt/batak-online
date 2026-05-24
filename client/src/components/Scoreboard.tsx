import { PublicPlayerInfo } from '@shared/types';

export default function Scoreboard({ players, declarerSeat }: { players: PublicPlayerInfo[]; declarerSeat: string | null }) {
  const sorted = [...players].sort((a, b) => b.totalScore - a.totalScore);
  return (
    <div className="bg-black/40 backdrop-blur rounded-xl border border-white/10 overflow-hidden shadow-lg min-w-[160px]">
      <div className="bg-black/30 px-3 py-1.5 text-white font-bold text-sm text-center">Skor</div>
      <div className="divide-y divide-white/10">
        {sorted.map((p) => (
          <div key={p.playerId} className={`flex justify-between items-center px-3 py-1.5 text-sm ${p.seat === declarerSeat ? 'bg-yellow-500/20' : ''}`}>
            <span className="text-white/90 font-medium">{p.name} {!p.isConnected && <span className="text-red-400 text-xs">(çevrimdışı)</span>}</span>
            <span className={`font-bold tabular-nums ml-2 ${p.totalScore < 0 ? 'text-red-400' : 'text-green-300'}`}>{p.totalScore}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
