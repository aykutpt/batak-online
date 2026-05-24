import { PublicGameState, Card as CardType, Suit, BidValue, Seat } from '@shared/types';
import { getLegalCards, SUIT_SYMBOLS } from '@shared/gameRules';
import CardComponent from './Card';
import CardBack from './CardBack';
import TrickArea from './TrickArea';
import BiddingPanel from './BiddingPanel';
import TrumpSelector from './TrumpSelector';
import Scoreboard from './Scoreboard';
import RoundSummary from './RoundSummary';

export interface GameTableProps {
  gameState: PublicGameState;
  myHand: Card[];
  mySeat: Seat | null;
  hostId?: string | null;
  myPlayerId?: string | null;
  illegalMoveMessage?: string;
  statusMessage?: string;
  onCardClick: (card: CardType) => void;
  onBid: (value: BidValue) => void;
  onTrumpSelect: (suit: Suit) => void;
  onNextRound: () => void;
  onLeave?: () => void;
}

type Card = CardType;

const PHASE_LABELS: Record<string, string> = {
  dealing: 'Kartlar dağıtılıyor…',
  bidding: 'İhale aşaması',
  trump_selection: 'Koz seçiliyor…',
  playing: 'Oyun',
  round_summary: 'Tur özeti',
  game_over: 'Oyun bitti',
};

export default function GameTable({
  gameState, myHand, mySeat, hostId, myPlayerId, illegalMoveMessage, statusMessage,
  onCardClick, onBid, onTrumpSelect, onNextRound, onLeave,
}: GameTableProps) {
  const { phase, players, currentTurnSeat, trumpSuit, leadSuit, declarerSeat,
    currentTrick, bids, highestBid, highestBidderSeat, currentBidderSeat,
    currentRound, config, roundResults } = gameState;

  const isMyTurn = mySeat && currentTurnSeat === mySeat;
  const canPlay = phase === 'playing' && !!isMyTurn;

  const legalCardIds = canPlay && trumpSuit
    ? new Set(getLegalCards(myHand, leadSuit).map((c) => c.id))
    : new Set<string>();

  const isHost = !!myPlayerId && myPlayerId === hostId;

  const getPlayer = (seat: Seat) => players.find((p) => p.seat === seat);
  const north = getPlayer('north');
  const west = getPlayer('west');
  const east = getPlayer('east');
  const south = getPlayer('south');

  const gameInfo = config.mode === 'score_limit'
    ? `${config.scoreLimit} puana kadar`
    : `Tur ${currentRound} / ${config.roundLimit}`;

  function PlayerLabel({ seat }: { seat: Seat }) {
    const p = getPlayer(seat);
    if (!p) return null;
    const isActive = currentTurnSeat === seat && (phase === 'playing' || phase === 'bidding' || phase === 'trump_selection');
    const isMe = seat === mySeat;
    return (
      <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold
        ${isActive ? 'bg-yellow-400 text-gray-900 shadow animate-pulse-slow' : 'bg-black/30 text-white'}`}>
        {isMe && '👤 '}{p.name}
        {declarerSeat === seat && trumpSuit && <span className="text-xs opacity-80">(İhaleci {SUIT_SYMBOLS[trumpSuit]})</span>}
        {!p.isConnected && <span className="text-red-400 text-xs ml-1">✗</span>}
        <span className="text-xs opacity-70">El:{p.tricksWon}</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-felt p-2 gap-2">
      {/* Top bar */}
      <div className="flex items-start gap-2 flex-wrap justify-between">
        <Scoreboard players={players} declarerSeat={declarerSeat} />

        <div className="flex-1 flex flex-col items-center gap-1 min-w-0">
          <div className="flex items-center gap-2 bg-black/30 rounded-full px-4 py-1.5">
            <span className="text-white/70 text-xs">{gameInfo}</span>
            <span className="text-white/40 text-xs">|</span>
            <span className="text-white text-xs font-medium">{PHASE_LABELS[phase] ?? phase}</span>
          </div>
          {statusMessage && (
            <div className="bg-blue-600/80 text-white text-sm px-3 py-1 rounded-full">{statusMessage}</div>
          )}
          {declarerSeat && highestBid > 0 && (
            <div className="bg-black/30 rounded-full px-3 py-0.5 text-xs text-white/70">
              İhale: <strong>{highestBid}</strong> · İhaleci: <strong>{getPlayer(declarerSeat as Seat)?.name}</strong>
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="bg-black/40 rounded-xl border border-white/10 px-3 py-2 min-w-[110px]">
            <div className="text-white/60 text-xs text-center mb-1">El Sayısı</div>
            {players.map((p) => (
              <div key={p.playerId} className="flex justify-between text-xs text-white gap-2">
                <span className="opacity-80 truncate max-w-[60px]">{p.name}</span>
                <span className="font-bold">{p.tricksWon}</span>
              </div>
            ))}
          </div>
          {onLeave && (
            <button
              onClick={onLeave}
              className="text-xs text-white/40 hover:text-red-400 transition-colors px-2 py-1 rounded border border-white/10 hover:border-red-400/30"
            >
              Oyundan Çık
            </button>
          )}
        </div>
      </div>

      {/* Illegal move error */}
      {illegalMoveMessage && (
        <div className="mx-auto bg-red-600/90 text-white text-sm px-4 py-2 rounded-lg max-w-sm text-center">
          {illegalMoveMessage}
        </div>
      )}

      {/* Table */}
      <div className="flex-1 flex flex-col items-center justify-between gap-2">
        {/* North */}
        <div className="flex flex-col items-center gap-1">
          <PlayerLabel seat="north" />
          <div className="flex gap-0.5">
            {Array.from({ length: north?.cardCount ?? 0 }).map((_, i) => (
              <CardBack key={i} size="sm" />
            ))}
          </div>
        </div>

        {/* Middle row */}
        <div className="flex items-center justify-center gap-4 w-full flex-1">
          {/* West */}
          <div className="flex flex-col items-center gap-1">
            <PlayerLabel seat="west" />
            <div className="flex flex-col gap-0.5">
              {Array.from({ length: west?.cardCount ?? 0 }).map((_, i) => (
                <div key={i} style={{ marginTop: i > 0 ? -44 : 0 }}>
                  <CardBack size="sm" />
                </div>
              ))}
            </div>
          </div>

          {/* Center */}
          <div className="flex flex-col items-center justify-center gap-3 min-w-[220px]">
            {phase === 'bidding' && (
              <BiddingPanel
                players={players} currentBidderSeat={currentBidderSeat} highestBid={highestBid}
                highestBidderSeat={highestBidderSeat} bids={bids} mySeat={mySeat}
                onBid={onBid}
              />
            )}
            {phase === 'trump_selection' && (() => {
              const declarer = players.find((p) => p.seat === declarerSeat);
              if (!declarer) return null;
              if (declarer.seat === mySeat) return <TrumpSelector bidAmount={highestBid} onSelect={onTrumpSelect} />;
              return (
                <div className="bg-black/40 backdrop-blur rounded-xl p-4 border border-white/10 text-white text-center">
                  {declarer.name} koz seçiyor…
                </div>
              );
            })()}
            {(phase === 'playing' || phase === 'dealing') && (
              <TrickArea trickCards={currentTrick} trumpSuit={trumpSuit} leadSuit={leadSuit} />
            )}
          </div>

          {/* East */}
          <div className="flex flex-col items-center gap-1">
            <PlayerLabel seat="east" />
            <div className="flex flex-col gap-0.5">
              {Array.from({ length: east?.cardCount ?? 0 }).map((_, i) => (
                <div key={i} style={{ marginTop: i > 0 ? -44 : 0 }}>
                  <CardBack size="sm" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* South — human hand */}
        <div className="flex flex-col items-center gap-2">
          <PlayerLabel seat="south" />
          <div className="flex flex-wrap justify-center gap-1 max-w-3xl">
            {mySeat === 'south'
              ? myHand.map((card) => (
                  <CardComponent
                    key={card.id} card={card} size="lg"
                    isLegal={canPlay ? legalCardIds.has(card.id) : true}
                    onClick={canPlay ? onCardClick : undefined}
                  />
                ))
              : Array.from({ length: south?.cardCount ?? 0 }).map((_, i) => <CardBack key={i} size="lg" />)
            }
          </div>
          {/* Show non-south player's hand if they are seated south */}
          {mySeat !== 'south' && mySeat !== null && (
            <div className="mt-2">
              <p className="text-white/60 text-xs text-center mb-1">Elin ({getPlayer(mySeat)?.name})</p>
              <div className="flex flex-wrap justify-center gap-1 max-w-3xl">
                {myHand.map((card) => (
                  <CardComponent
                    key={card.id} card={card} size="lg"
                    isLegal={canPlay ? legalCardIds.has(card.id) : true}
                    onClick={canPlay ? onCardClick : undefined}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Round summary modal */}
      {phase === 'round_summary' && roundResults.length > 0 && (
        <RoundSummary
          result={roundResults[roundResults.length - 1]}
          players={players}
          isHost={isHost}
          onNext={onNextRound}
        />
      )}
    </div>
  );
}
