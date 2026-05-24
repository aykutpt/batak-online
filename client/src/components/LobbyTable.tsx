import { LobbyState, Seat } from '@shared/types';

const SEATS: Seat[] = ['south', 'west', 'north', 'east'];
const SEAT_LABELS: Record<Seat, string> = { south: 'Güney ↓', west: '← Batı', north: '↑ Kuzey', east: 'Doğu →' };

interface Props {
  lobby: LobbyState;
  myPlayerId: string;
  onSelectSeat: (seat: Seat) => void;
  onAddBot: (seat: Seat) => void;
  onRemoveBot: (seat: Seat) => void;
  onSetReady: (ready: boolean) => void;
  onStartGame: () => void;
}

export default function LobbyTable({ lobby, myPlayerId, onSelectSeat, onAddBot, onRemoveBot, onSetReady, onStartGame }: Props) {
  const isHost = myPlayerId === lobby.hostId;
  const myLobbyPlayer = lobby.seats.flatMap((s) => s.player ? [s.player] : []).find((p) => p.playerId === myPlayerId);
  const isReady = myLobbyPlayer?.isReady ?? false;
  const mySeat = lobby.seats.find((s) => s.player?.playerId === myPlayerId)?.seat;

  const allSeatsReady = lobby.seats.every((s) => {
    if (!s.player) return false;
    return s.player.isBot || s.player.isReady;
  });
  const allSeatsFilled = lobby.seats.every((s) => s.player !== null);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {SEATS.map((seat) => {
          const seatInfo = lobby.seats.find((s) => s.seat === seat);
          const player = seatInfo?.player;
          const isEmpty = !player;
          const isMe = player?.playerId === myPlayerId;
          const isMyCurrentSeat = mySeat === seat;

          return (
            <div key={seat}
              className={`rounded-xl border-2 p-3 transition-all
                ${isEmpty ? 'border-dashed border-white/20 bg-white/5' : isMe ? 'border-yellow-400 bg-yellow-400/10' : 'border-white/20 bg-white/10'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/60 text-xs font-medium">{SEAT_LABELS[seat]}</span>
                {player?.isReady && !player.isBot && (
                  <span className="text-green-400 text-xs font-semibold">✓ Hazır</span>
                )}
              </div>

              {player ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-semibold text-sm">
                      {player.isBot ? '🤖' : isMe ? '👤' : '🧑'} {player.name}
                    </p>
                    {!player.isConnected && (
                      <p className="text-red-400 text-xs">bağlantı koptu</p>
                    )}
                  </div>
                  {isHost && player.isBot && (
                    <button onClick={() => onRemoveBot(seat)} className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded border border-red-400/30 hover:border-red-300/50 transition-colors">
                      Kaldır
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex gap-2">
                  {!isMyCurrentSeat && (
                    <button onClick={() => onSelectSeat(seat)}
                      className="flex-1 text-white/70 hover:text-white text-xs px-2 py-1.5 rounded border border-white/20 hover:border-white/40 transition-colors">
                      Otur
                    </button>
                  )}
                  <button onClick={() => onAddBot(seat)}
                    className="flex-1 text-blue-300 hover:text-blue-200 text-xs px-2 py-1.5 rounded border border-blue-400/30 hover:border-blue-300/50 transition-colors">
                    Bot Ekle
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex gap-3">
        {mySeat && (
          <button
            onClick={() => onSetReady(!isReady)}
            className={`flex-1 font-semibold py-2.5 rounded-xl transition-colors ${isReady ? 'bg-yellow-500 hover:bg-yellow-400 text-gray-900' : 'bg-green-600 hover:bg-green-500 text-white'}`}>
            {isReady ? 'Hazır Değil' : 'Hazır'}
          </button>
        )}
        {isHost && (
          <button
            onClick={onStartGame}
            disabled={!allSeatsFilled || !allSeatsReady}
            className={`flex-1 font-semibold py-2.5 rounded-xl transition-colors ${allSeatsFilled && allSeatsReady ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-white/10 text-white/30 cursor-not-allowed'}`}>
            Oyunu Başlat
          </button>
        )}
      </div>
    </div>
  );
}
