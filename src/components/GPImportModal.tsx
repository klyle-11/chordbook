import { useState, useRef, useMemo } from 'react';
import { parseGPFile, type GPFileData, type GPNote } from '../lib/gpParser';
import { findChordByNotes } from '../lib/chordUtils';
import type { ChordVoicing } from '../types/chord';
import type { LeadNote } from '../types/lead';

// ─── Import result types ───

export interface ImportedProgression {
  name: string;
  chords: { name: string; notes: string[]; voicing?: ChordVoicing }[];
}

export interface ImportedLead {
  name: string;
  notes: LeadNote[];
  tuningId: string;
}

interface GPImportModalProps {
  onImport: (progressions: ImportedProgression[], leads: ImportedLead[]) => void;
  onClose: () => void;
  currentTuningId: string;
}

// ─── Helpers ───

function detectChordFromNotes(notes: GPNote[]): { name: string; pitchClasses: string[] } | null {
  if (notes.length < 2) return null;
  const pcs = [...new Set(notes.map(n => n.pitchClass))];
  const name = findChordByNotes(pcs);
  if (name) return { name, pitchClasses: pcs };
  // Fallback: just use root + "?"
  return { name: pcs[0] + '?', pitchClasses: pcs };
}

function buildVoicing(notes: GPNote[], stringCount: number, tuningId: string): ChordVoicing {
  const frets: (number | null)[] = Array(stringCount).fill(null);
  for (const n of notes) {
    if (n.string < stringCount) frets[n.string] = n.fret;
  }
  return { frets, tuningId };
}

const PITCH_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

function midiToNoteName(midi: number): string {
  return PITCH_NAMES[((midi % 12) + 12) % 12];
}

// ─── Component ───

export default function GPImportModal({ onImport, onClose, currentTuningId }: GPImportModalProps) {
  const [gpData, setGpData] = useState<GPFileData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedTracks, setSelectedTracks] = useState<Set<number>>(new Set());
  const [fromMeasure, setFromMeasure] = useState(1);
  const [toMeasure, setToMeasure] = useState(1);
  const fileRef = useRef<HTMLInputElement>(null);

  // Parse file
  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const buf = await file.arrayBuffer();
      const data = await parseGPFile(buf);
      setGpData(data);
      // Auto-select melodic tracks
      const melodic = new Set(data.tracks.filter(t => !t.isPercussion).map(t => t.id));
      setSelectedTracks(melodic);
      setFromMeasure(1);
      setToMeasure(data.masterBars.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file');
    } finally {
      setLoading(false);
    }
  }

  function toggleTrack(id: number) {
    setSelectedTracks(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // Preview: detected chords per selected track in the measure range
  const preview = useMemo(() => {
    if (!gpData) return [];
    const bars = gpData.masterBars.slice(fromMeasure - 1, toMeasure);
    return gpData.tracks
      .filter(t => selectedTracks.has(t.id))
      .map(track => {
        const chords: string[] = [];
        const trackIdx = gpData.tracks.indexOf(track);
        for (const mb of bars) {
          const bar = mb.bars[trackIdx];
          if (!bar) continue;
          for (const beat of bar.beats) {
            if (beat.isRest || beat.notes.length === 0) continue;
            if (beat.notes.length >= 2) {
              const det = detectChordFromNotes(beat.notes);
              if (det && !chords.includes(det.name)) chords.push(det.name);
            }
          }
        }
        return { track, chords };
      });
  }, [gpData, selectedTracks, fromMeasure, toMeasure]);

  // Build import data
  function handleImport() {
    if (!gpData) return;
    const bars = gpData.masterBars.slice(fromMeasure - 1, toMeasure);
    const progressions: ImportedProgression[] = [];
    const leads: ImportedLead[] = [];

    for (const track of gpData.tracks) {
      if (!selectedTracks.has(track.id)) continue;
      if (track.isPercussion) continue;

      const trackIdx = gpData.tracks.indexOf(track);
      const chordList: ImportedProgression['chords'] = [];
      const leadNotes: LeadNote[] = [];
      let lastChordName = '';

      for (const mb of bars) {
        const bar = mb.bars[trackIdx];
        if (!bar) continue;

        for (const beat of bar.beats) {
          if (beat.isRest || beat.notes.length === 0) continue;

          if (beat.notes.length >= 2) {
            // Multi-note → chord
            const det = detectChordFromNotes(beat.notes);
            if (det && det.name !== lastChordName) {
              chordList.push({
                name: det.name,
                notes: det.pitchClasses,
                voicing: buildVoicing(beat.notes, track.stringCount, currentTuningId),
              });
              lastChordName = det.name;
            }
          } else {
            // Single note → lead
            const n = beat.notes[0];
            leadNotes.push({
              note: midiToNoteName(n.midi),
              stringIndex: n.string,
              fret: n.fret,
            });
          }
        }
      }

      if (chordList.length > 0) {
        progressions.push({ name: track.name, chords: chordList });
      }
      if (leadNotes.length > 0) {
        leads.push({ name: `${track.name} — imported`, notes: leadNotes, tuningId: currentTuningId });
      }
    }

    onImport(progressions, leads);
  }

  const totalMeasures = gpData?.masterBars.length || 0;

  return (
    <div className="fixed inset-0 themed-overlay flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="themed-dialog w-full max-w-lg max-h-[85vh] flex flex-col animate-fade-in"
        onClick={e => e.stopPropagation()}
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <h3 className="text-base font-semibold" style={{ color: 'var(--text)', fontFamily: 'var(--font-ui)' }}>
            Import Tab
          </h3>
          <button onClick={onClose} className="text-lg" style={{ color: 'var(--text-muted)' }}>✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {/* File picker */}
          {!gpData && (
            <div>
              <input
                ref={fileRef}
                type="file"
                accept=".gp,.gp3,.gp4,.gp5,.gpx"
                onChange={handleFile}
                className="hidden"
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full py-8 rounded-lg text-sm font-medium transition-colors"
                style={{
                  border: '2px dashed var(--border)',
                  color: 'var(--text-secondary)',
                  background: 'var(--bg-secondary)',
                }}
              >
                {loading ? 'Parsing...' : 'Select Guitar Pro file (.gp, .gp4, .gp5)'}
              </button>
              {error && (
                <p className="mt-2 text-sm" style={{ color: 'var(--danger)' }}>{error}</p>
              )}
            </div>
          )}

          {/* Parsed file info */}
          {gpData && (
            <>
              {/* Song info */}
              <div className="space-y-1">
                <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                  {gpData.title || 'Untitled'}
                </div>
                {gpData.artist && (
                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{gpData.artist}</div>
                )}
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {gpData.bpm} BPM · {totalMeasures} measures · {gpData.tracks.length} tracks
                </div>
              </div>

              {/* Track selection */}
              <div>
                <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>
                  Tracks
                </div>
                <div className="space-y-1">
                  {gpData.tracks.map(track => (
                    <label
                      key={track.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors"
                      style={{
                        background: selectedTracks.has(track.id) ? 'var(--accent-subtle)' : 'transparent',
                        opacity: track.isPercussion ? 0.4 : 1,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedTracks.has(track.id)}
                        onChange={() => toggleTrack(track.id)}
                        disabled={track.isPercussion}
                        className="rounded"
                      />
                      <span className="text-sm flex-1" style={{ color: 'var(--text)' }}>
                        {track.name || `Track ${track.id + 1}`}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {track.isPercussion ? 'drums' : `${track.stringCount}str`}
                      </span>
                      {!track.isPercussion && track.strings.length > 0 && (
                        <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                          {track.strings.slice(0, track.stringCount).map(m => PITCH_NAMES[m % 12]).join('')}
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              {/* Measure range */}
              <div>
                <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>
                  Measures
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={totalMeasures}
                    value={fromMeasure}
                    onChange={e => setFromMeasure(Math.max(1, Math.min(parseInt(e.target.value) || 1, toMeasure)))}
                    className="themed-input w-20 text-sm text-center"
                  />
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>to</span>
                  <input
                    type="number"
                    min={1}
                    max={totalMeasures}
                    value={toMeasure}
                    onChange={e => setToMeasure(Math.max(fromMeasure, Math.min(parseInt(e.target.value) || 1, totalMeasures)))}
                    className="themed-input w-20 text-sm text-center"
                  />
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>of {totalMeasures}</span>
                </div>
              </div>

              {/* Preview */}
              {preview.length > 0 && (
                <div>
                  <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>
                    Detected Chords
                  </div>
                  <div className="space-y-2">
                    {preview.map(({ track, chords }) => (
                      <div key={track.id}>
                        <div className="text-xs font-medium mb-1" style={{ color: 'var(--text)' }}>
                          {track.name}
                        </div>
                        {chords.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {chords.map((c, i) => (
                              <span
                                key={i}
                                className="inline-block rounded-full px-2 text-xs"
                                style={{
                                  background: 'rgba(96,165,250,0.12)',
                                  color: '#60a5fa',
                                  lineHeight: '20px',
                                }}
                              >
                                {c}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            No chords (single-note lines → lead)
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {gpData && (
          <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
            <button
              onClick={() => { setGpData(null); setError(null); }}
              className="text-sm"
              style={{ color: 'var(--text-muted)' }}
            >
              Change file
            </button>
            <div className="flex gap-2">
              <button onClick={onClose} className="themed-btn-secondary text-sm">Cancel</button>
              <button
                onClick={handleImport}
                disabled={selectedTracks.size === 0}
                className="themed-btn-primary text-sm"
                style={{ opacity: selectedTracks.size === 0 ? 0.5 : 1 }}
              >
                Import {selectedTracks.size} track{selectedTracks.size !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
