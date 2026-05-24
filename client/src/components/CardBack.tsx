interface Props { size?: 'sm' | 'md' | 'lg'; rotate?: boolean }
const SIZES = { sm: 'w-10 h-14', md: 'w-14 h-20', lg: 'w-16 h-24' };

export default function CardBack({ size = 'md', rotate = false }: Props) {
  return (
    <div className={`${SIZES[size]} ${rotate ? 'rotate-90' : ''} rounded-lg border-2 border-blue-800 bg-blue-900 overflow-hidden relative shadow-md flex-shrink-0`}>
      <div className="absolute inset-1 rounded border border-blue-600 opacity-50" />
      <div className="absolute inset-0" style={{ backgroundImage: 'repeating-linear-gradient(45deg,rgba(255,255,255,0.03) 0px,rgba(255,255,255,0.03) 2px,transparent 2px,transparent 8px)' }} />
      <div className="absolute inset-0 flex items-center justify-center text-blue-300 opacity-20 text-lg font-bold">♠</div>
    </div>
  );
}
