import { useState, useRef, useCallback, useEffect } from 'react';
import type { NamedProgression, ChordPairing, TimeSignature } from '../types/song';
import { EditableText } from './EditableText';

interface PairedProgressionPanelProps {
  pairing: ChordPairing;
  progressions: NamedProgression[];
  timeSignature: TimeSignature;
  bpm: number;
  onUpdateChordBeats: (progressionId: string, chordIndex: number, beats: number) => void;
  onRenamePairing: (pairingId: string, name: string) => void;
  onDeletePairing: (pairingId: string) => void;
  onReorderPairingProgressions: (pairingId: string, oldIndex: number, newIndex: number) => void;
  onClose: () => void;
}

interface BeatPopoverState {
  progressionId: string;
  chordIndex: number;
  x: number;
  y: number;
}

function getProgressionTotalBeats(progression: NamedProgression, beatsPerMeasure: number): number {
  return progression.chords.reduce((sum, chord) => sum + (chord.beats ?? beatsPerMeasure), 0);
}

export function PairedProgressionPanel({
  pairing,
  progressions,
  timeSignature,
  bpm,
  onUpdateChordBeats,
  onRenamePairing,
  onDeletePairing,
  onReorderPairingProgressions,
  onClose,
}: PairedProgressionPanelProps) {
  const { beatsPerMeasure } = timeSignature;
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0); // 0-1
  const [beatPopover, setBeatPopover] = useState<BeatPopoverState | null>(null);
  const [popoverBeats, setPopoverBeats] = useState(beatsPerMeasure);

  const playStartRef = useRef<number>(0);
  const animFrameRef = useRef<number>(0);
  const timelineRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const clickIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const beatCountRef = useRef<number>(0);

  // Total beats is the max across all progressions
  const totalBeats = Math.max(
    ...progressions.map(p => getProgressionTotalBeats(p, beatsPerMeasure)),
    beatsPerMeasure // minimum one measure
  );

  const totalMeasures = Math.ceil(totalBeats / beatsPerMeasure);
  const msPerBeat = 60000 / bpm;
  const totalMs = totalBeats * msPerBeat;

  // Playhead animation
  const animatePlayhead = useCallback(() => {
    const elapsed = Date.now() - playStartRef.current;
    const progress = Math.min(elapsed / totalMs, 1);
    setPlaybackProgress(progress);
    if (progress < 1) {
      animFrameRef.current = requestAnimationFrame(animatePlayhead);
    } else {
      setIsPlaying(false);
      setPlaybackProgress(0);
    }
  }, [totalMs]);

  const playClick = useCallback((accent = false) => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(accent ? 1200 : 800, ctx.currentTime);
    osc.type = 'sine';
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(accent ? 0.4 : 0.3, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
  }, []);

  const startPlayback = useCallback(() => {
    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioContextRef.current = new AudioCtx();
    }
    playStartRef.current = Date.now();
    setIsPlaying(true);
    setPlaybackProgress(0);
    animFrameRef.current = requestAnimationFrame(animatePlayhead);

    // Start click track
    beatCountRef.current = 0;
    playClick(true);
    beatCountRef.current = 1;
    clickIntervalRef.current = setInterval(() => {
      const isAccent = beatCountRef.current % beatsPerMeasure === 0;
      playClick(isAccent);
      beatCountRef.current++;
      if (beatCountRef.current >= totalBeats) {
        if (clickIntervalRef.current) clearInterval(clickIntervalRef.current);
      }
    }, msPerBeat);
  }, [animatePlayhead, playClick, beatsPerMeasure, totalBeats, msPerBeat]);

  const stopPlayback = useCallback(() => {
    setIsPlaying(false);
    setPlaybackProgress(0);
    cancelAnimationFrame(animFrameRef.current);
    if (clickIntervalRef.current) {
      clearInterval(clickIntervalRef.current);
      clickIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      if (clickIntervalRef.current) clearInterval(clickIntervalRef.current);
    };
  }, []);

  const handleChordBlockClick = (
    e: React.MouseEvent,
    progressionId: string,
    chordIndex: number,
    currentBeats: number
  ) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const containerRect = timelineRef.current?.getBoundingClientRect();
    if (!containerRect) return;
    setBeatPopover({
      progressionId,
      chordIndex,
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.bottom - containerRect.top + 4,
    });
    setPopoverBeats(currentBeats);
  };

  const applyBeatChange = (beats: number) => {
    if (!beatPopover || beats < 1) return;
    onUpdateChordBeats(beatPopover.progressionId, beatPopover.chordIndex, beats);
    setBeatPopover(null);
  };

  // Find which chord is currently "active" given the playback progress
  const getActiveChordIndex = (progression: NamedProgression): number => {
    if (!isPlaying) return -1;
    const currentBeat = playbackProgress * totalBeats;
    let cumulative = 0;
    for (let i = 0; i < progression.chords.length; i++) {
      cumulative += progression.chords[i].beats ?? beatsPerMeasure;
      if (currentBeat < cumulative) return i;
    }
    return -1;
  };

  return (
    <div className="paired-panel themed-card" ref={timelineRef} onClick={() => setBeatPopover(null)}>
      {/* Panel Header */}
      <div className="paired-panel__top">
        <EditableText
          value={pairing.name}
          onChange={(value) => onRenamePairing(pairing.id, value)}
          placeholder="Untitled Pairing"
          className="paired-panel__title"
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="paired-panel__info">
            {totalMeasures} measure{totalMeasures !== 1 ? 's' : ''} &middot; {timeSignature.beatsPerMeasure}/{timeSignature.beatUnit}
          </span>
          <button
            className="playback-strip__transport-btn"
            onClick={isPlaying ? stopPlayback : startPlayback}
            aria-label={isPlaying ? 'Stop' : 'Play'}
            data-active={isPlaying}
          >
            {isPlaying ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            )}
          </button>
          <button
            className="playback-strip__transport-btn"
            onClick={onClose}
            aria-label="Close panel"
            title="Close"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div className="paired-panel__timeline" style={{ position: 'relative' }}>
        {/* Measure Header */}
        <div className="paired-panel__header">
          <div className="paired-panel__row-label" />
          <div className="paired-panel__grid">
            {Array.from({ length: totalMeasures }, (_, i) => (
              <div
                key={i}
                className="paired-panel__measure-label"
                style={{ width: `${(beatsPerMeasure / totalBeats) * 100}%` }}
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>

        {/* Progression Rows */}
        {progressions.map((progression, rowIndex) => {
          const activeIdx = getActiveChordIndex(progression);
          return (
            <div key={progression.id} className="paired-panel__row">
              <div className="paired-panel__row-label" title={progression.name}>
                <span className="paired-panel__row-name">{progression.name}</span>
                {/* Row reorder buttons */}
                {progressions.length > 1 && (
                  <span className="paired-panel__row-arrows">
                    {rowIndex > 0 && (
                      <button
                        className="paired-panel__arrow-btn"
                        onClick={() => onReorderPairingProgressions(pairing.id, rowIndex, rowIndex - 1)}
                        title="Move up"
                      >&#9650;</button>
                    )}
                    {rowIndex < progressions.length - 1 && (
                      <button
                        className="paired-panel__arrow-btn"
                        onClick={() => onReorderPairingProgressions(pairing.id, rowIndex, rowIndex + 1)}
                        title="Move down"
                      >&#9660;</button>
                    )}
                  </span>
                )}
              </div>
              <div className="paired-panel__grid">
                {progression.chords.length === 0 ? (
                  <div className="paired-panel__empty" style={{ width: '100%' }}>
                    (no chords)
                  </div>
                ) : (
                  <>
                    {progression.chords.map((chord, chordIndex) => {
                      const beats = chord.beats ?? beatsPerMeasure;
                      const widthPercent = (beats / totalBeats) * 100;
                      return (
                        <div
                          key={chordIndex}
                          className={`paired-panel__block ${activeIdx === chordIndex ? 'paired-panel__block--active' : ''}`}
                          style={{ width: `${widthPercent}%` }}
                          onClick={(e) => handleChordBlockClick(e, progression.id, chordIndex, beats)}
                          title={`${chord.name} (${beats} beat${beats !== 1 ? 's' : ''})`}
                        >
                          <span className="paired-panel__block-name">{chord.name}</span>
                          <span className="paired-panel__block-beats">{beats}b</span>
                        </div>
                      );
                    })}
                    {/* Empty trailing space if this progression is shorter */}
                    {(() => {
                      const progBeats = getProgressionTotalBeats(progression, beatsPerMeasure);
                      const remaining = totalBeats - progBeats;
                      if (remaining <= 0) return null;
                      return (
                        <div
                          className="paired-panel__empty"
                          style={{ width: `${(remaining / totalBeats) * 100}%` }}
                        />
                      );
                    })()}
                  </>
                )}
              </div>
            </div>
          );
        })}

        {/* Measure Lines */}
        <div className="paired-panel__measure-lines" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <div className="paired-panel__row-label" />
          <div style={{ flex: 1, position: 'relative', height: '100%' }}>
            {Array.from({ length: totalMeasures + 1 }, (_, i) => (
              <div
                key={i}
                className="paired-panel__measure-line"
                style={{ left: `${(i * beatsPerMeasure / totalBeats) * 100}%` }}
              />
            ))}
          </div>
        </div>

        {/* Playhead */}
        {isPlaying && (
          <div className="paired-panel__measure-lines" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <div className="paired-panel__row-label" />
            <div style={{ flex: 1, position: 'relative', height: '100%' }}>
              <div
                className="paired-panel__playhead"
                style={{ left: `${playbackProgress * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Beat Popover */}
        {beatPopover && (
          <div
            className="paired-panel__popover"
            style={{ left: beatPopover.x, top: beatPopover.y }}
            onClick={e => e.stopPropagation()}
          >
            <div className="paired-panel__popover-row">
              <button className="paired-panel__popover-step" onClick={() => setPopoverBeats(Math.max(beatsPerMeasure, popoverBeats - beatsPerMeasure))}>-</button>
              <span className="paired-panel__popover-value">{popoverBeats}</span>
              <button className="paired-panel__popover-step" onClick={() => setPopoverBeats(popoverBeats + beatsPerMeasure)}>+</button>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>beats</span>
            </div>
            <div className="paired-panel__popover-row">
              {[beatsPerMeasure, beatsPerMeasure * 2].map(n => (
                <button
                  key={n}
                  className={`paired-panel__popover-quick ${popoverBeats === n ? 'paired-panel__popover-quick--active' : ''}`}
                  onClick={() => setPopoverBeats(n)}
                >
                  {n}
                </button>
              ))}
            </div>
            <button className="themed-btn-primary" style={{ width: '100%', fontSize: '0.75rem', padding: '3px 0' }} onClick={() => applyBeatChange(popoverBeats)}>
              Apply
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
