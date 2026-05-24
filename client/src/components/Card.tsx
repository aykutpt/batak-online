import { Card as CardType, Suit } from '@shared/types';

interface Props {
  card: CardType;
  onClick?: (card: CardType) => void;
  isLegal?: boolean;
  size?: 'sm' | 'md' | 'lg';
  animate?: boolean;
}

const SUIT_COLOR: Record<Suit, string> = {
  spades: 'text-gray-900', clubs: 'text-gray-900',
  hearts: 'text-red-600', diamonds: 'text-red-600',
};
const SUIT_SYMBOL: Record<Suit, string> = {
  spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣',
};
const SIZES = {
  sm: { card: 'w-10 h-14', rank: 'text-xs', sym: 'text-base' },
  md: { card: 'w-14 h-20', rank: 'text-xs', sym: 'text-xl' },
  lg: { card: 'w-16 h-24', rank: 'text-sm', sym: 'text-2xl' },
};

export default function Card({ card, onClick, isLegal = true, size = 'md', animate = false }: Props) {
  const color = SUIT_COLOR[card.suit];
  const sym = SUIT_SYMBOL[card.suit];
  const sz = SIZES[size];
  const clickable = !!onClick && isLegal;

  return (
    <div
      onClick={() => clickable && onClick!(card)}
      className={[
        sz.card,
        'relative rounded-lg border-2 bg-white flex flex-col justify-between p-1 select-none flex-shrink-0',
        'transition-all duration-150',
        color,
        isLegal ? 'border-gray-300 shadow-md' : 'border-gray-200 opacity-40 cursor-not-allowed',
        clickable ? 'cursor-pointer hover:-translate-y-2 hover:shadow-xl hover:border-yellow-400 active:translate-y-0' : '',
        animate ? 'animate-card-in' : '',
      ].filter(Boolean).join(' ')}
    >
      <div className="flex flex-col items-start leading-none">
        <span className={`font-bold ${sz.rank}`}>{card.rank}</span>
        <span className={`leading-none ${sz.rank}`}>{sym}</span>
      </div>
      <div className={`absolute inset-0 flex items-center justify-center ${sz.sym} opacity-20 pointer-events-none`}>{sym}</div>
      <div className="flex flex-col items-end leading-none rotate-180">
        <span className={`font-bold ${sz.rank}`}>{card.rank}</span>
        <span className={`leading-none ${sz.rank}`}>{sym}</span>
      </div>
    </div>
  );
}
