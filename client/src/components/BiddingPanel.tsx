import { BidValue, PublicPlayerInfo, Bid } from '@shared/types';

interface Props {
  players: PublicPlayerInfo[];
  currentBidderSeat: string | null;
  highestBid: number;
  highestBidderSeat: string | null;
  bids: Bid[];
  mySeat: string | null;
  onBid: (value: BidValue) => void;
}

const BID_OPTIONS = [5, 6, 7, 8, 9, 10, 11, 12, 13] as const;

export default function BiddingPanel({ players, currentBidderSeat, highestBid, highestBidderSeat, bids, mySeat, onBid }: Props) {
  const isMyTurn = currentBidderSeat === mySeat;
  const currentBidder = players.find((p) => p.seat === currentBidderSeat);
  const highestBidder = players.find((p) => p.seat === highestBidderSeat);

  const getPlayerName = (seat: string) => players.find((p) => p.seat === seat)?.name ?? seat;

  return (
    <div className="bg-black/40 backdrop-blur rounded-xl p-4 border border-white/10 shadow-xl w-full max-w-sm mx-auto">
      <h2 className="text-white font-bold text-center text-lg mb-3">İhale</h2>

      {highestBidder ? (
        <p className="text-yellow-300 text-sm text-center mb-2">
          En yüksek: <strong>{highestBid}</strong> — {highestBidder.name}
        </p>
      ) : (
        <p className="text-gray-400 text-sm text-center mb-2">Henüz ihale yok</p>
      )}

      {bids.length > 0 && (
        <div className="flex flex-wrap gap-1 justify-center mb-3">
          {bids.map((b, i) => (
            <span key={i} className="bg-white/10 text-white text-xs px-2 py-0.5 rounded-full">
              {getPlayerName(b.seat)}: {b.value === 'pass' ? 'Geç' : b.value}
            </span>
          ))}
        </div>
      )}

      <p className="text-center text-sm mb-3">
        {isMyTurn ? (
          <span className="text-yellow-300 font-semibold">Sıra sende — İhale ver ya da geç</span>
        ) : currentBidder ? (
          <span className="text-white/70">{currentBidder.name} düşünüyor…</span>
        ) : null}
      </p>

      {isMyTurn && (
        <div className="flex gap-2 flex-wrap justify-center">
          <button onClick={() => onBid('pass')} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-semibold text-sm transition-colors">
            Geç
          </button>
          {BID_OPTIONS.map((v) => {
            const disabled = v <= highestBid;
            return (
              <button
                key={v} disabled={disabled} onClick={() => onBid(v as BidValue)}
                className={`px-3 py-2 rounded-lg font-semibold text-sm transition-colors ${disabled ? 'bg-white/10 text-white/30 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500 text-white'}`}
              >
                {v}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
