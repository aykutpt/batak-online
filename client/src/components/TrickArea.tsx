import { PlayedCard, Suit, Seat } from '@shared/types';
import { SUIT_NAMES, SUIT_SYMBOLS } from '@shared/gameRules';
import CardComponent from './Card';

interface Props {
  trickCards: PlayedCard[];
  trumpSuit: Suit | null;
  leadSuit: Suit | null;
}

const POS: Record<Seat, string> = {
  north: 'col-start-2 row-start-1',
  west:  'col-start-1 row-start-2',
  east:  'col-start-3 row-start-2',
  south: 'col-start-2 row-start-3',
};

export default function TrickArea({ trickCards, trumpSuit, leadSuit }: Props) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex gap-2 flex-wrap justify-center">
        {trumpSuit && (
          <div className={`rounded-full px-2 py-0.5 text-xs font-bold flex items-center gap-1 bg-yellow-500/90 text-gray-900`}>
            Koz: <span className={trumpSuit === 'hearts' || trumpSuit === 'diamonds' ? 'text-red-700' : ''}>{SUIT_SYMBOLS[trumpSuit]} {SUIT_NAMES[trumpSuit]}</span>
          </div>
        )}
        {leadSuit && trickCards.length > 0 && (
          <div className="bg-white/20 text-white rounded-full px-2 py-0.5 text-xs">
            Renk: {SUIT_SYMBOLS[leadSuit]}
          </div>
        )}
      </div>

      <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(3,56px)', gridTemplateRows: 'repeat(3,80px)' }}>
        {(['north','west','east','south'] as Seat[]).map((pos) => {
          const tc = trickCards.find((c) => c.seat === pos);
          return (
            <div key={pos} className={`${POS[pos]} flex items-center justify-center`}>
              {tc
                ? <CardComponent card={tc.card} size="md" animate />
                : <div className="w-14 h-20 rounded-lg border border-white/10 bg-white/5" />
              }
            </div>
          );
        })}
      </div>
    </div>
  );
}
