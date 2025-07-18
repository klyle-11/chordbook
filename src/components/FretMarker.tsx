import { getFretCenterPosition } from '../lib/fretPositions';
import { audioPlayer } from '../lib/audioPlayer';

interface FretMarkerProps {
    fret: number;
    note: string;
}

export default function FretMarker({ fret, note }: FretMarkerProps) {
    const isOpenNote = fret === 0;
    
    const handleClick = async () => {
        await audioPlayer.playNote(note, 0.8); // Play for 0.8 seconds
    };
    
    return (
        <div
            className={`absolute w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold border-2 cursor-pointer group z-10 transition-transform hover:scale-110 ${
                isOpenNote 
                    ? 'bg-green-400 text-black border-green-600 hover:bg-green-500' 
                    : 'bg-amber-400 text-black border-amber-600 hover:bg-amber-500'
            }`}
            style={{ 
                left: `${getFretCenterPosition(fret)}%`, 
                transform: 'translateX(-50%) translateY(-50%)',
                top: '50%'
            }}
            title={`Click to play ${note}`}
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