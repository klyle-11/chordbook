import { getFretCenterPosition } from '../lib/fretPositions';
import { audioPlayer } from '../lib/audioPlayer';
import { type Tuning } from '../lib/tunings';

interface FretMarkerProps {
    fret: number;
    note: string;
    guitarString: string;
    stringIndex: number;
    tuning: Tuning;
    onFretClick?: (stringIndex: number, fret: number, note: string) => void;
    isLeadNote?: boolean;
    isOverlap?: boolean;
    isVoicing?: boolean;
    isOctaveVoicing?: boolean;
    isRoot?: boolean;
}

export default function FretMarker({ fret, note, guitarString, stringIndex, tuning, onFretClick, isLeadNote, isOverlap, isVoicing, isOctaveVoicing, isRoot }: FretMarkerProps) {
    const isOpenNote = fret === 0;
    const isLeadOnly = isLeadNote && !isOverlap;

    const handleClick = async () => {
        await audioPlayer.playNote(note, 0.8, guitarString, fret, stringIndex, tuning);
        onFretClick?.(stringIndex, fret, note);
    };

    const baseStyle: React.CSSProperties = isLeadOnly
        ? { background: 'var(--lead)', borderColor: 'var(--lead)', color: '#000' }
        : { background: 'var(--accent)', borderColor: 'var(--accent-hover)', color: '#fff' };

    const overlapStyle: React.CSSProperties = isOverlap
        ? { boxShadow: '0 0 0 3px var(--lead)' }
        : {};

    const voicingStyle: React.CSSProperties = isVoicing
        ? { boxShadow: '0 0 0 3px var(--glow), 0 0 10px var(--glow), 0 0 20px var(--glow-subtle)', zIndex: 20 }
        : isOctaveVoicing
        ? { boxShadow: '0 0 0 2px var(--glow)', zIndex: 15 }
        : {};

    const rootStyle: React.CSSProperties = isRoot
        ? { background: '#6b3a2a', borderColor: '#4a2218', color: '#f0e0d0' }
        : {};

    return (
        <div
            className="absolute w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold border-2 cursor-pointer group z-10 transition-transform hover:scale-110"
            style={{
                left: `${getFretCenterPosition(fret)}%`,
                transform: 'translateX(-50%) translateY(-50%)',
                top: '50%',
                ...baseStyle,
                ...rootStyle,
                ...overlapStyle,
                ...voicingStyle,
            }}
            title={`Click to play ${note}${isLeadNote ? ' (in lead)' : ''}`}
            onClick={handleClick}
        >
            {isOpenNote ? (
                <>
                    {/* For open notes, show fret number by default, note name on hover */}
                    <span className="group-hover:opacity-0 transition-opacity duration-200">{fret}</span>
                    <span className="absolute inset-0 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200">{note}</span>
                </>
            ) : (
                <>
                    {/* For fretted notes, show fret number by default, note name on hover */}
                    <span className="group-hover:opacity-0 transition-opacity duration-200">{fret}</span>
                    <span className="absolute inset-0 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200">{note}</span>
                </>
            )}
        </div>
    );
}