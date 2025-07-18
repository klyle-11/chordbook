import { getFretsForNoteOnString } from "../lib/fretUtils";
import { getFretPositions } from "../lib/fretPositions";
import { type Tuning, getTuningStrings, type CapoSettings, isFretAvailable, applyCapo } from "../lib/tunings";
import FretMarker from "./FretMarker";

interface FretBoardProps {
    chordNotes: string[];
    tuning: Tuning;
    capoSettings: CapoSettings;
}

export default function Fretboard({ chordNotes, tuning, capoSettings }: FretBoardProps) {
    const effectiveTuning = capoSettings.enabled && capoSettings.fret > 0 
        ? applyCapo(tuning, capoSettings.fret) 
        : tuning;
    const strings = getTuningStrings(effectiveTuning);
    const fretPositions = getFretPositions();
    
    return (
        <div className="mt-8 p-4 bg-gray-100 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">
                Fretboard
                {capoSettings.enabled && capoSettings.fret > 0 && (
                    <span className="text-sm font-normal text-gray-600 ml-2">
                        (Capo on fret {capoSettings.fret})
                    </span>
                )}
            </h3>
            <div className="space-y-3">
                {strings.map((stringRoot, stringIndex) => {
                    const markers = chordNotes.flatMap((note) => 
                        getFretsForNoteOnString(stringRoot, note)
                            .filter(fret => fret <= 24) // Limit to 24 frets
                            .filter(fret => isFretAvailable(fret, capoSettings.enabled ? capoSettings.fret : 0))
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
                                        className={`absolute top-0 bottom-0 w-px ${
                                            capoSettings.enabled && fret === capoSettings.fret 
                                                ? 'bg-amber-500 w-1' 
                                                : !isFretAvailable(fret, capoSettings.enabled ? capoSettings.fret : 0)
                                                ? 'bg-gray-300'
                                                : 'bg-gray-400'
                                        }`}
                                        style={{ left: `${position}%` }}
                                    />
                                ))}
                                
                                {/* Capo bar */}
                                {capoSettings.enabled && capoSettings.fret > 0 && (
                                    <div
                                        className="absolute top-1 bottom-1 w-1 bg-amber-500 rounded"
                                        style={{ left: `${fretPositions[capoSettings.fret]}%` }}
                                    />
                                )}
                                
                                {/* Note markers */}
                                {markers.map((marker, i) => (
                                    <FretMarker
                                        key={`${marker.note}-${marker.fret}-${i}`}
                                        fret={marker.fret}
                                        note={marker.note}
                                        guitarString={stringRoot}
                                        stringIndex={stringIndex}
                                        tuning={tuning}
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
                                className={`absolute text-xs transform -translate-x-1/2 ${
                                    !isFretAvailable(fret, capoSettings.enabled ? capoSettings.fret : 0)
                                        ? 'text-gray-300 line-through'
                                        : capoSettings.enabled && fret === capoSettings.fret
                                        ? 'text-amber-600 font-bold'
                                        : 'text-gray-500'
                                }`}
                                style={{ left: `${position}%` }}
                            >
                                {fret}
                                {capoSettings.enabled && fret === capoSettings.fret && (
                                    <div className="text-xs text-amber-600">C</div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="w-20"></div>
            </div>
        </div>
    );
}