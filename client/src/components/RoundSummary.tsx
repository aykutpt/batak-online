import { RoundResult, PublicPlayerInfo } from '@shared/types';
import { SUIT_NAMES, SUIT_SYMBOLS } from '@shared/gameRules';

interface Props {
  result: RoundResult;
  players: PublicPlayerInfo[];
  isHost: boolean;
  onNext: () => void;
}

export default function RoundSummary({ result, players, isHost, onNext }: Props) {
  const declarer = players.find((p) => p.seat === result.declarerSeat)!;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-felt-dark border border-white/20 rounded-2xl shadow-2xl w-full max-w-md p-6 text-white">
        <h2 className="text-2xl font-bold text-center mb-1">Tur Sonucu</h2>
        <p className="text-center text-white/60 text-sm mb-4">Tur {result.round}</p>

        <div className={`rounded-xl p-3 mb-4 text-center ${result.declarerSucceeded ? 'bg-green-600/30 border border-green-500/50' : 'bg-red-600/30 border border-red-500/50'}`}>
          <p className="font-semibold">
            {declarer?.name} — <span className={result.declarerSucceeded ? 'text-green-300' : 'text-red-300'}>
              {result.declarerSucceeded ? '✓ Başarılı' : '✗ Başarısız'}
            </span>
          </p>
          <p className="text-sm opacity-80">
            İhale: {result.bidAmount} | Koz: {SUIT_SYMBOLS[result.trumpSuit]} {SUIT_NAMES[result.trumpSuit]} | El: {result.tricksWon[result.declarerSeat]}
          </p>
        </div>

        <table className="w-full text-sm mb-5">
          <thead>
            <tr className="text-white/60 border-b border-white/10">
              <th className="text-left py-1">Oyuncu</th>
              <th className="text-center py-1">El</th>
              <th className="text-right py-1">Bu tur</th>
              <th className="text-right py-1">Toplam</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => {
              const gained = result.pointsGained[p.seat] ?? 0;
              return (
                <tr key={p.playerId} className="border-b border-white/5">
                  <td className="py-1.5 font-medium">
                    {p.name}{p.seat === result.declarerSeat && <span className="ml-1 text-yellow-400 text-xs">★</span>}
                  </td>
                  <td className="text-center py-1.5 text-white/70">{result.tricksWon[p.seat] ?? 0}</td>
                  <td className={`text-right py-1.5 font-bold ${gained < 0 ? 'text-red-400' : 'text-green-300'}`}>
                    {gained > 0 ? '+' : ''}{gained}
                  </td>
                  <td className={`text-right py-1.5 font-bold tabular-nums ${result.totalScores[p.seat] < 0 ? 'text-red-400' : 'text-white'}`}>
                    {result.totalScores[p.seat]}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {isHost ? (
          <button onClick={onNext} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition-colors text-lg">
            Yeni Tur
          </button>
        ) : (
          <p className="text-center text-white/60">Oda sahibi yeni turu başlatacak…</p>
        )}
      </div>
    </div>
  );
}
