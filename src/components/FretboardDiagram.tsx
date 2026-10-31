import { getFretsForNoteOnString, normalizeNote } from "../lib/fretUtils";
import { getFretPositions, getFretCenterPosition } from "../lib/fretPositions";
import { type Tuning, getTuningStrings, type CapoSettings, isFretAvailable, applyCapo } from "../lib/tunings";
import FretMarker from "./FretMarker";

interface FretboardDiagramProps {
    chordNotes: string[];
    tuning: Tuning;
    capoSettings: CapoSettings;
    onFretClick?: (stringIndex: number, fret: number, note: string) => void;
    activeLeadNotes?: string[];
    previewNotes?: string[];
    voicingFrets?: (number | null)[];
    /** Pixel height of each string row; markers and labels scale with it. Omit for the default responsive size. */
    rowHeight?: number;
    /** Hide the title row, for panels that already label the fretboard. */
    hideTitle?: boolean;
}

export default function FretboardDiagram({ chordNotes, tuning, capoSettings, onFretClick, activeLeadNotes, previewNotes, voicingFrets, rowHeight, hideTitle }: FretboardDiagramProps) {
    const effectiveTuning = capoSettings.enabled && capoSettings.fret > 0
        ? applyCapo(tuning, capoSettings.fret)
        : tuning;
    const strings = getTuningStrings(effectiveTuning);
    const fretPositions = getFretPositions();

    // Root note is the first note in the chord (normalized for comparison)
    const rootNote = chordNotes.length > 0 ? normalizeNote(chordNotes[0]) : null;

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

    // Explicit sizing: markers, labels and string thickness all scale with the row height
    const sizing = rowHeight !== undefined ? {
        marker: { width: rowHeight - 2, height: rowHeight - 2, fontSize: Math.max(7, Math.round((rowHeight - 2) * 0.5)) },
        label: Math.max(9, Math.round(rowHeight * 0.55)),
        fretLabel: Math.max(8, Math.round(rowHeight * 0.45)),
        stringLine: Math.max(2, Math.round(rowHeight / 6)),
    } : null;

    return (
        <div className={`${hideTitle ? '' : 'mt-3 '}p-2 sm:p-3 rounded-lg`} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            {!hideTitle && (
                <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3" style={{ color: 'var(--text)' }}>
                    Fretboard
                    {capoSettings.enabled && capoSettings.fret > 0 && (
                        <span className="text-xs sm:text-sm font-normal ml-2" style={{ color: 'var(--text-secondary)' }}>
                            (Capo on fret {capoSettings.fret})
                        </span>
                    )}
                </h3>
            )}
            <div className={sizing ? undefined : 'space-y-0.5 sm:space-y-1'}>
                {strings.map((stringRoot, stringIndex) => {
                    const chordMarkers = chordNotes.flatMap((note) =>
                        getFretsForNoteOnString(stringRoot, note)
                            .filter(fret => fret <= 24)
                            .filter(fret => isFretAvailable(fret, capoSettings.enabled ? capoSettings.fret : 0))
                            .map((fret) => ({ note, fret }))
                    );

                    // Lead-only markers: notes in active lead but NOT in chord
                    const leadOnlyNotes = activeLeadNotes
                        ? activeLeadNotes.filter(n => !chordNotes.includes(n))
                        : [];
                    const leadOnlyMarkers = leadOnlyNotes.flatMap((note) =>
                        getFretsForNoteOnString(stringRoot, note)
                            .filter(fret => fret <= 24)
                            .filter(fret => isFretAvailable(fret, capoSettings.enabled ? capoSettings.fret : 0))
                            .map((fret) => ({ note, fret }))
                    );

                    const chordNoteSet = activeLeadNotes ? new Set(activeLeadNotes) : null;
                    const allMarkerCount = chordMarkers.length + leadOnlyMarkers.length;

                    return (
                        <div key={stringIndex} className="flex items-center">
                            {/* String label */}
                            <div className="w-6 sm:w-8 text-xs sm:text-sm font-medium" style={{ color: 'var(--text-secondary)', fontSize: sizing?.label }}>
                                {stringRoot}
                            </div>

                            {/* String line with fret markers */}
                            <div className="relative flex-1 h-4 sm:h-5 mx-1 sm:mx-2 flex items-center" style={{ height: rowHeight }}>
                                {/* String line */}
                                <div className="absolute left-0 right-0 h-1 top-1/2 transform -translate-y-1/2" style={{ background: 'var(--fret-string)', height: sizing?.stringLine }}></div>

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
                                            note={marker.note}
                                            guitarString={stringRoot}
                                            stringIndex={stringIndex}
                                            tuning={tuning}
                                            onFretClick={onFretClick}
                                            isLeadNote={chordNoteSet?.has(marker.note)}
                                            isOverlap={chordNoteSet?.has(marker.note)}
                                            isVoicing={voicingSet.has(key)}
                                            isOctaveVoicing={octaveVoicingSet.has(key)}
                                            isRoot={rootNote !== null && normalizeNote(marker.note) === rootNote}
                                            sizeStyle={sizing?.marker}
                                        />
                                    );
                                })}

                                {/* Lead-only note markers */}
                                {leadOnlyMarkers.map((marker, i) => (
                                    <FretMarker
                                        key={`lead-${marker.note}-${marker.fret}-${i}`}
                                        fret={marker.fret}
                                        note={marker.note}
                                        guitarString={stringRoot}
                                        stringIndex={stringIndex}
                                        tuning={tuning}
                                        onFretClick={onFretClick}
                                        isLeadNote
                                        sizeStyle={sizing?.marker}
                                    />
                                ))}

                                {/* Preview/next-chord note markers (faded) */}
                                {previewNotes && previewNotes
                                    .filter(n => !chordNotes.some(cn => normalizeNote(cn) === normalizeNote(n)))
                                    .flatMap((note) =>
                                        getFretsForNoteOnString(stringRoot, note)
                                            .filter(fret => fret <= 24)
                                            .filter(fret => isFretAvailable(fret, capoSettings.enabled ? capoSettings.fret : 0))
                                            .map((fret) => ({ note, fret }))
                                    )
                                    .map((marker, i) => (
                                        <div
                                            key={`preview-${marker.note}-${marker.fret}-${i}`}
                                            className="absolute w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold border-2 z-5"
                                            style={{
                                                left: `${getFretCenterPosition(marker.fret)}%`,
                                                transform: 'translateX(-50%) translateY(-50%)',
                                                top: '50%',
                                                background: 'var(--glow)',
                                                borderColor: 'var(--glow)',
                                                color: '#fff',
                                                opacity: 0.3,
                                                pointerEvents: 'none',
                                                ...sizing?.marker,
                                            }}
                                            title={`Next: ${marker.note}`}
                                        >
                                            {marker.note}
                                        </div>
                                    ))
                                }
                            </div>

                            {/* Fret numbers for reference */}
                            <div className="w-12 sm:w-20 text-xs" style={{ color: 'var(--text-muted)', fontSize: sizing?.fretLabel }}>
                                {allMarkerCount > 0 ? `${allMarkerCount} note${allMarkerCount !== 1 ? 's' : ''}` : 'X'}
                            </div>
                        </div>
                    );
                })}
            </div>
            
            {/* Fret number labels */}
            <div className="flex items-center mt-2 sm:mt-3" style={{ marginTop: rowHeight !== undefined ? Math.round(rowHeight / 3) : undefined }}>
                <div className="w-6 sm:w-8"></div>
                <div className="relative flex-1 mx-1 sm:mx-2">
                    <div className="relative h-3 sm:h-4" style={{ height: sizing ? sizing.fretLabel + 4 : undefined }}>
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
                                        fontSize: sizing?.fretLabel,
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