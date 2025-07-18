import type { Chord } from '../types/chord';

interface ChordIconsProps {
  chords: Chord[];
  className?: string;
}

export function ChordIcons({ chords, className = "" }: ChordIconsProps) {
  if (chords.length === 0) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      {chords.map((chord, index) => (
        <span
          key={`${chord.name}-${index}`}
          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200"
        >
          {chord.name}
        </span>
      ))}
    </div>
  );
}
