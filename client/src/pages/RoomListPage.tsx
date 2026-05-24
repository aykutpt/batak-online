import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RoomSummary, Seat } from '@shared/types';
import { socket, connectSocket } from '../socket/socket';

const SEAT_LABELS: Record<Seat, string> = {
  south: 'Güney', west: 'Batı', north: 'Kuzey', east: 'Doğu',
};
const SEATS: Seat[] = ['south', 'west', 'north', 'east'];

function RoomCard({ room, onJoin, onDelete }: { room: RoomSummary; onJoin: () => void; onDelete: () => void }) {
  const filledCount = 4 - room.availableSeats;
  const canJoin = room.phase === 'lobby' && room.availableSeats > 0;

  return (
    <div className="bg-felt-dark border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4">
      {/* Sol: kod + durum */}
      <div className="flex items-center gap-3 min-w-[140px]">
        <div>
          <span className="font-mono font-bold text-white text-lg tracking-widest">{room.code}</span>
          <div className="mt-1">
            {room.phase === 'lobby' ? (
              <span className="bg-green-600/30 text-green-300 text-xs px-2 py-0.5 rounded-full border border-green-500/30">
                Lobide · {filledCount}/4
              </span>
            ) : (
              <span className="bg-yellow-600/30 text-yellow-300 text-xs px-2 py-0.5 rounded-full border border-yellow-500/30">
                Oyunda · {filledCount}/4
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Orta: koltuklar */}
      <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2">
        {SEATS.map((seat) => {
          const player = room.players.find((p) => p.seat === seat);
          return (
            <div key={seat} className={`rounded-lg px-2 py-1.5 text-xs text-center
              ${player ? 'bg-white/10 border border-white/20' : 'bg-white/5 border border-white/5'}`}>
              <div className="text-white/40 mb-0.5">{SEAT_LABELS[seat]}</div>
              {player ? (
                <div className={`font-semibold truncate ${player.isBot ? 'text-white/50' : 'text-white'}`}>
                  {player.isBot ? '🤖 ' : '👤 '}{player.name}
                </div>
              ) : (
                <div className="text-white/25 italic">Boş</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Sağ: katıl + sil butonları */}
      <div className="sm:min-w-[130px] flex items-center gap-2 justify-end">
        {canJoin ? (
          <button
            onClick={onJoin}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-xl transition-colors text-sm"
          >
            Katıl
          </button>
        ) : (
          <span className="text-white/30 text-xs">
            {room.phase === 'lobby' ? 'Dolu' : 'Devam ediyor'}
          </span>
        )}
        <button
          onClick={onDelete}
          className="text-red-400/60 hover:text-red-400 text-xs px-2 py-2 rounded-lg border border-red-400/20 hover:border-red-400/50 transition-colors"
          title="Odayı Sil"
        >
          Sil
        </button>
      </div>
    </div>
  );
}

export default function RoomListPage() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    connectSocket();

    function onRoomList(data: RoomSummary[]) {
      setRooms(data);
      setLoading(false);
      setLastUpdated(new Date());
    }

    socket.on('roomListData', onRoomList);
    socket.emit('subscribeRoomList');

    return () => {
      socket.off('roomListData', onRoomList);
      socket.emit('unsubscribeRoomList');
    };
  }, []);

  const lobbyRooms = rooms.filter((r) => r.phase === 'lobby');
  const activeRooms = rooms.filter((r) => r.phase === 'playing');

  return (
    <div className="min-h-screen bg-felt p-4">
      <div className="max-w-3xl mx-auto">

        {/* Başlık */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/')}
            className="text-white/50 hover:text-white text-sm transition-colors"
          >
            ← Geri
          </button>
          <h1 className="text-2xl font-bold text-white">Aktif Odalar</h1>
          <span className="bg-white/10 text-white/60 text-xs px-2 py-1 rounded-full">
            {rooms.length} / 100
          </span>
          {lastUpdated && (
            <span className="text-white/30 text-xs ml-auto">
              Güncellendi: {lastUpdated.toLocaleTimeString('tr-TR')}
            </span>
          )}
        </div>

        {loading ? (
          <div className="text-center text-white/50 py-20">
            <div className="text-4xl mb-3">⏳</div>
            Odalar yükleniyor…
          </div>
        ) : rooms.length === 0 ? (
          <div className="text-center text-white/50 py-20">
            <div className="text-5xl mb-4">🃏</div>
            <p className="text-lg mb-2">Henüz aktif oda yok.</p>
            <p className="text-sm text-white/30 mb-6">İlk odayı sen kur!</p>
            <button
              onClick={() => navigate('/create')}
              className="bg-green-600 hover:bg-green-500 text-white font-bold px-8 py-3 rounded-xl transition-colors"
            >
              Oda Kur
            </button>
          </div>
        ) : (
          <div className="space-y-5">

            {/* Katılılabilir odalar */}
            {lobbyRooms.length > 0 && (
              <section>
                <h2 className="text-white/60 text-sm font-semibold uppercase tracking-wider mb-2 pl-1">
                  Katılabilir Odalar — {lobbyRooms.length}
                </h2>
                <div className="space-y-2">
                  {lobbyRooms.map((room) => (
                    <RoomCard
                      key={room.code}
                      room={room}
                      onJoin={() => navigate(`/join/${room.code}`)}
                      onDelete={() => socket.emit('deleteRoom', { code: room.code })}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Devam eden oyunlar */}
            {activeRooms.length > 0 && (
              <section>
                <h2 className="text-white/60 text-sm font-semibold uppercase tracking-wider mb-2 pl-1">
                  Devam Eden Oyunlar — {activeRooms.length}
                </h2>
                <div className="space-y-2">
                  {activeRooms.map((room) => (
                    <RoomCard
                      key={room.code}
                      room={room}
                      onJoin={() => {}}
                      onDelete={() => socket.emit('deleteRoom', { code: room.code })}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* Alt: oda kur */}
        {!loading && rooms.length > 0 && (
          <div className="mt-8 text-center">
            <button
              onClick={() => navigate('/create')}
              className="bg-green-600 hover:bg-green-500 text-white font-bold px-8 py-3 rounded-xl transition-colors"
            >
              + Yeni Oda Kur
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
