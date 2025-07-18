import { getFretsForNoteOnString } from "../lib/fretUtils";
import { getFretPositions } from "../lib/fretPositions";
import FretMarker from "./FretMarker";

interface FretBoardProps {
    chordNotes: string[];
}

const strings = ["E", "A", "D", "G", "B", "E"];

export default function Fretboard({ chordNotes }: FretBoardProps) {
    const fretPositions = getFretPositions();
    
    return (
        <div className="mt-8 p-4 bg-gray-100 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Fretboard</h3>
            <div className="space-y-3">
                {strings.map((stringRoot, stringIndex) => {
                    const markers = chordNotes.flatMap((note) => 
                        getFretsForNoteOnString(stringRoot, note)
                            .filter(fret => fret <= 24) // Limit to 24 frets
                            .map((fret) => ({
                                note,
                                fret,
                            }))
                    );
                
                    return (
                        <div key={stringIndex} className="flex items-center">
                            {/* String label */}
                            <div className="w-8 text-sm font-medium text-gray-700">
                                {stringRoot}
                            </div>
                            
                            {/* String line with fret markers */}
                            <div className="relative flex-1 h-8 mx-2 flex items-center">
                                {/* String line */}
                                <div className="absolute left-0 right-0 h-1 bg-gray-600 top-1/2 transform -translate-y-1/2"></div>
                                
                                {/* Fret position lines */}
                                {fretPositions.map((position, fret) => (
                                    <div
                                        key={fret}
                                        className="absolute top-0 bottom-0 w-px bg-gray-400"
                                        style={{ left: `${position}%` }}
                                    />
                                ))}
                                
                                {/* Note markers */}
                                {markers.map((marker, i) => (
                                    <FretMarker
                                        key={`${marker.note}-${marker.fret}-${i}`}
                                        fret={marker.fret}
                                        note={marker.note}
                                    />
                                ))}
                            </div>
                            
                            {/* Fret numbers for reference */}
                            <div className="w-20 text-xs text-gray-500">
                                {markers.length > 0 ? `${markers.length} note${markers.length !== 1 ? 's' : ''}` : 'X'}
                            </div>
                        </div>
                    );
                })}
            </div>
            
            {/* Fret number labels */}
            <div className="flex items-center mt-4">
                <div className="w-8"></div>
                <div className="relative flex-1 mx-2">
                    <div className="relative h-6">
                        {fretPositions.map((position, fret) => (
                            <div 
                                key={fret}
                                className="absolute text-xs text-gray-500 transform -translate-x-1/2"
                                style={{ left: `${position}%` }}
                            >
                                {fret}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="w-20"></div>
            </div>
        </div>
    );
}