import { Link } from 'react-router-dom';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-felt flex items-center justify-center p-4">
      <div className="bg-felt-dark border border-white/20 rounded-2xl shadow-2xl w-full max-w-sm p-8 text-white">
        <div className="text-center mb-8">
          <div className="flex justify-center gap-4 text-5xl mb-4">
            <span>♠</span><span className="text-red-400">♥</span>
            <span className="text-red-400">♦</span><span>♣</span>
          </div>
          <h1 className="text-4xl font-bold">BATAK</h1>
          <p className="text-white/60 mt-1 text-sm">Türk Koz Oyunu — Online</p>
        </div>

        <div className="space-y-3">
          <Link to="/rooms"
            className="block w-full text-center bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold py-3 rounded-xl transition-colors text-lg">
            🔍 Odaları Gör
          </Link>
          <Link to="/create"
            className="block w-full text-center bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition-colors text-lg">
            Oda Kur
          </Link>
          <Link to="/join"
            className="block w-full text-center bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-colors text-lg">
            Odaya Katıl (Kod ile)
          </Link>
          <Link to="/practice"
            className="block w-full text-center bg-white/10 hover:bg-white/20 text-white font-semibold py-3 rounded-xl transition-colors">
            🤖 Botlara Karşı Oyna
          </Link>
        </div>
      </div>
    </div>
  );
}
