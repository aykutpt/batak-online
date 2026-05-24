import { Suit } from '@shared/types';
import { SUIT_NAMES, SUIT_SYMBOLS } from '@shared/gameRules';

const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
const COLOR: Record<Suit, string> = { spades: 'text-gray-900', hearts: 'text-red-600', diamonds: 'text-red-600', clubs: 'text-gray-900' };

export default function TrumpSelector({ bidAmount, onSelect }: { bidAmount: number; onSelect: (suit: Suit) => void }) {
  return (
    <div className="bg-black/40 backdrop-blur rounded-xl p-5 border border-white/10 shadow-xl text-center max-w-xs mx-auto">
      <h2 className="text-white font-bold text-lg mb-1">Koz Seç</h2>
      <p className="text-yellow-300 text-sm mb-4">İhaleyi {bidAmount} ile kazandın. Hangi renk koz olsun?</p>
      <div className="grid grid-cols-2 gap-3">
        {SUITS.map((suit) => (
          <button key={suit} onClick={() => onSelect(suit)}
            className={`bg-white rounded-xl p-4 flex flex-col items-center gap-1 hover:scale-105 hover:shadow-lg transition-all ${COLOR[suit]}`}>
            <span className="text-4xl">{SUIT_SYMBOLS[suit]}</span>
            <span className="font-bold text-sm">{SUIT_NAMES[suit]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
