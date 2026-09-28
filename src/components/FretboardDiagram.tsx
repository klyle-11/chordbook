import { getFretsForNoteOnString, pitchClass } from "../lib/music/notes";
import { getFretPositions, getFretCenterPosition } from "../lib/fretPositions";
import { type Tuning, getTuningStrings, type CapoSettings, isFretAvailable, getCapoFret, getSoundingTuning } from "../lib/music/tunings";
import FretMarker from "./FretMarker";

interface FretboardDiagramProps {
    chordNotes: string[];
    tuning: Tuning;
    capoSettings: CapoSettings;
    onFretClick?: (stringIndex: number, fret: number, note: string) => void;
    activeLeadNotes?: string[];
    previewNotes?: string[];
    voicingFrets?: (number | null)[];
    /** Hide the title and outer box (used in the song header) */
    compact?: boolean;
}

export default function FretboardDiagram({ chordNotes, tuning, capoSettings, onFretClick, activeLeadNotes, previewNotes, voicingFrets, compact = false }: FretboardDiagramProps) {
    // All fret numbers here (markers, voicingFrets, onFretClick) are relative to the capo,
    // matching tab/voicing convention. Only drawing positions add the capo back.
    const capoFret = getCapoFret(capoSettings);
    const soundingTuning = getSoundingTuning(tuning, capoSettings);
    const strings = getTuningStrings(soundingTuning);
    const fretPositions = getFretPositions();
    const maxRelativeFret = 24 - capoFret;

    const chordPcs = new Set(chordNotes.map(pitchClass));
    const rootPc = chordNotes.length > 0 ? pitchClass(chordNotes[0]) : null;

    const markersFor = (stringRoot: string, notes: string[]) =>
        notes.flatMap(note =>
            getFretsForNoteOnString(stringRoot, note, maxRelativeFret).map(fret => ({ note, fret }))
        );

    // Build sets for voicing highlight lookup: exact position and octave (+12)
    const voicingSet = new Set<string>();
    const octaveVoicingSet = new Set<string>();
    if (voicingFrets) {
        voicingFrets.forEach((fret, stringIndex) => {
            if (fret !== null && fret !== undefined) {
                voicingSet.add(`${stringIndex}-${fret}`);
                const octaveFret = fret + 12;
                if (octaveFret <= 24) {
                    octaveVoicingSet.add(`${stringIndex}-${octaveFret}`);
                }
            }
        });
    }
    return (
        <div
            className={compact ? '' : 'mt-3 p-2 sm:p-3 rounded-lg'}
            style={compact ? undefined : { background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
        >
            {!compact && (
            <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3" style={{ color: 'var(--text)' }}>
                Fretboard
                {capoSettings.enabled && capoSettings.fret > 0 && (
                    <span className="text-xs sm:text-sm font-normal ml-2" style={{ color: 'var(--text-secondary)' }}>
                        (Capo on fret {capoSettings.fret})
                    </span>
                )}
            </h3>
            )}
            <div className="space-y-0.5 sm:space-y-1">
                {strings.map((stringRoot, stringIndex) => {
                    const chordMarkers = markersFor(stringRoot, chordNotes);

                    // Lead-only markers: notes in active lead but NOT in chord
                    const leadOnlyNotes = activeLeadNotes
                        ? activeLeadNotes.filter(n => !chordPcs.has(pitchClass(n)))
                        : [];
                    const leadOnlyMarkers = markersFor(stringRoot, leadOnlyNotes);

                    const leadPcs = activeLeadNotes ? new Set(activeLeadNotes.map(pitchClass)) : null;
                    const allMarkerCount = chordMarkers.length + leadOnlyMarkers.length;

                    return (
                        <div key={stringIndex} className="flex items-center">
                            {/* String label */}
                            <div className="w-6 sm:w-8 text-xs sm:text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                                {stringRoot}
                            </div>

                            {/* String line with fret markers */}
                            <div className="relative flex-1 h-4 sm:h-5 mx-1 sm:mx-2 flex items-center">
                                {/* String line */}
                                <div className="absolute left-0 right-0 h-1 top-1/2 transform -translate-y-1/2" style={{ background: 'var(--fret-string)' }}></div>

                                {/* Fret position lines */}
                                {fretPositions.map((position, fret) => (
                                    <div
                                        key={fret}
                                        className="absolute top-0 bottom-0"
                                        style={{
                                            left: `${position}%`,
                                            width: capoSettings.enabled && fret === capoSettings.fret ? 3 : 1,
                                            background: capoSettings.enabled && fret === capoSettings.fret
                                                ? 'var(--glow)'
                                                : !isFretAvailable(fret, capoSettings.enabled ? capoSettings.fret : 0)
                                                ? 'var(--fret-divider-muted)'
                                                : 'var(--fret-divider)',
                                        }}
                                    />
                                ))}

                                {/* Capo bar */}
                                {capoSettings.enabled && capoSettings.fret > 0 && (
                                    <div
                                        className="absolute top-1 bottom-1 rounded"
                                        style={{ left: `${fretPositions[capoSettings.fret]}%`, width: 3, background: 'var(--glow)', boxShadow: '0 0 6px var(--glow-subtle)' }}
                                    />
                                )}

                                {/* Chord note markers */}
                                {chordMarkers.map((marker, i) => {
                                    const key = `${stringIndex}-${marker.fret}`;
                                    return (
                                        <FretMarker
                                            key={`chord-${marker.note}-${marker.fret}-${i}`}
                                            fret={marker.fret}
                                            capoFret={capoFret}
                                            note={marker.note}
                                            guitarString={stringRoot}
                                            stringIndex={stringIndex}
                                            tuning={soundingTuning}
                                            onFretClick={onFretClick}
                                            isLeadNote={leadPcs?.has(pitchClass(marker.note))}
                                            isOverlap={leadPcs?.has(pitchClass(marker.note))}
                                            isVoicing={voicingSet.has(key)}
                                            isOctaveVoicing={octaveVoicingSet.has(key)}
                                            isRoot={rootPc !== null && pitchClass(marker.note) === rootPc}
                                        />
                                    );
                                })}

                                {/* Lead-only note markers */}
                                {leadOnlyMarkers.map((marker, i) => (
                                    <FretMarker
                                        key={`lead-${marker.note}-${marker.fret}-${i}`}
                                        fret={marker.fret}
                                        capoFret={capoFret}
                                        note={marker.note}
                                        guitarString={stringRoot}
                                        stringIndex={stringIndex}
                                        tuning={soundingTuning}
                                        onFretClick={onFretClick}
                                        isLeadNote
                                    />
                                ))}

                                {/* Preview/next-chord note markers (faded) */}
                                {previewNotes && markersFor(stringRoot, previewNotes.filter(n => !chordPcs.has(pitchClass(n))))
                                    .map((marker, i) => (
                                        <div
                                            key={`preview-${marker.note}-${marker.fret}-${i}`}
                                            className="absolute w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold border-2 z-5"
                                            style={{
                                                left: `${getFretCenterPosition(marker.fret + capoFret)}%`,
                                                transform: 'translateX(-50%) translateY(-50%)',
                                                top: '50%',
                                                background: 'var(--glow)',
                                                borderColor: 'var(--glow)',
                                                color: '#fff',
                                                opacity: 0.3,
                                                pointerEvents: 'none',
                                            }}
                                            title={`Next: ${marker.note}`}
                                        >
                                            {marker.note}
                                        </div>
                                    ))
                                }
                            </div>

                            {/* Fret numbers for reference */}
                            <div className="w-12 sm:w-20 text-xs" style={{ color: 'var(--text-muted)' }}>
                                {allMarkerCount > 0 ? `${allMarkerCount} note${allMarkerCount !== 1 ? 's' : ''}` : 'X'}
                            </div>
                        </div>
                    );
                })}
            </div>
            
            {/* Fret number labels */}
            <div className="flex items-center mt-2 sm:mt-3">
                <div className="w-6 sm:w-8"></div>
                <div className="relative flex-1 mx-1 sm:mx-2">
                    <div className="relative h-3 sm:h-4">
                        {fretPositions.map((position, fret) => {
                            // For fret 0, position at the nut (divider)
                            // For other frets, position at the center between this fret and the previous one
                            const labelPosition = fret === 0 
                                ? position 
                                : (fretPositions[fret - 1] + position) / 2;
                            
                            return (
                                <div
                                    key={fret}
                                    className={`absolute text-xs transform -translate-x-1/2 ${
                                        !isFretAvailable(fret, capoSettings.enabled ? capoSettings.fret : 0)
                                            ? 'line-through'
                                            : capoSettings.enabled && fret === capoSettings.fret
                                            ? 'font-bold'
                                            : ''
                                    }`}
                                    style={{
                                        left: `${labelPosition}%`,
                                        color: !isFretAvailable(fret, capoSettings.enabled ? capoSettings.fret : 0)
                                            ? 'var(--fret-divider-muted)'
                                            : capoSettings.enabled && fret === capoSettings.fret
                                            ? 'var(--glow)'
                                            : 'var(--text-muted)',
                                    }}
                                >
                                    {fret}
                                    {capoSettings.enabled && fret === capoSettings.fret && (
                                        <div className="text-xs" style={{ color: 'var(--glow)' }}>C</div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="w-12 sm:w-20"></div>
            </div>
        </div>
    );
}