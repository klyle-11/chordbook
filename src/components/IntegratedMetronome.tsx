import React, { useState, useRef, useEffect, useCallback } from 'react';
import { audioPlayer } from '../lib/audioPlayer';
import type { TimeSignature } from '../types/song';

interface IntegratedMetronomeProps {
  onTempoChange?: (bpm: number) => void;
  currentBpm?: number;
  disabled?: boolean;
  timeSignature?: TimeSignature;
}

export function IntegratedMetronome({ onTempoChange, currentBpm, disabled, timeSignature }: IntegratedMetronomeProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showClickVol, setShowClickVol] = useState(false);
  const [bpm, setBpm] = useState(currentBpm || 120);
  const [bpmInput, setBpmInput] = useState(String(currentBpm || 120));
  const [clickVolume, setClickVolume] = useState(0.5);
  const [masterVolume, setMasterVolume] = useState(audioPlayer.getVolume());
  const [isMasterMuted, setIsMasterMuted] = useState(false);

  const beatsPerMeasure = timeSignature?.beatsPerMeasure ?? 4;

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const bpmValidationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const beatCountRef = useRef<number>(0);
  const isSyncingRef = useRef(false);

  useEffect(() => {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioContextRef.current = new AudioContextClass();
    return () => { audioContextRef.current?.close(); };
  }, []);

  // Notify parent only for user-driven changes, not external syncs
  const onTempoChangeRef = useRef(onTempoChange);
  onTempoChangeRef.current = onTempoChange;

  useEffect(() => {
    if (isSyncingRef.current) {
      isSyncingRef.current = false;
      return;
    }
    onTempoChangeRef.current?.(bpm);
  }, [bpm]);

  // Sync from parent (song switch)
  useEffect(() => {
    if (currentBpm !== undefined && Math.abs(currentBpm - bpm) > 0.1) {
      isSyncingRef.current = true;
      setBpm(currentBpm);
      setBpmInput(String(currentBpm));
    }
  }, [currentBpm]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync master volume to audioPlayer
  useEffect(() => {
    audioPlayer.setVolume(isMasterMuted ? 0 : masterVolume);
  }, [masterVolume, isMasterMuted]);

  const playClick = useCallback((accent = false) => {
    if (!audioContextRef.current) return;
    const context = audioContextRef.current;
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    oscillator.frequency.setValueAtTime(accent ? 1200 : 800, context.currentTime);
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0, context.currentTime);
    gainNode.gain.linearRampToValueAtTime(accent ? Math.min(clickVolume * 1.3, 1) : clickVolume, context.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.1);
    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + 0.1);
  }, [clickVolume]);

  const startMetronome = useCallback(() => {
    if (intervalRef.current) return;
    const interval = 60000 / bpm;
    beatCountRef.current = 0;
    playClick(true); // first beat is accented
    beatCountRef.current = 1;
    intervalRef.current = setInterval(() => {
      const isAccent = beatCountRef.current % beatsPerMeasure === 0;
      playClick(isAccent);
      beatCountRef.current++;
    }, interval);
    setIsPlaying(true);
  }, [bpm, beatsPerMeasure, playClick]);

  const stopMetronome = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (bpmValidationTimerRef.current) clearTimeout(bpmValidationTimerRef.current);
    };
  }, []);

  const validateAndSetBpm = useCallback((value: string) => {
    if (value === '') { setBpm(120); setBpmInput('120'); return; }
    const newBpm = parseInt(value, 10);
    if (!isNaN(newBpm)) {
      const clampedBpm = Math.max(40, Math.min(300, newBpm));
      setBpm(clampedBpm);
      setBpmInput(clampedBpm.toString());
      if (isPlaying) { stopMetronome(); setTimeout(() => startMetronome(), 50); }
    }
  }, [isPlaying, stopMetronome, startMetronome]);

  const handleBpmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setBpmInput(value);
    if (bpmValidationTimerRef.current) clearTimeout(bpmValidationTimerRef.current);
    bpmValidationTimerRef.current = setTimeout(() => { validateAndSetBpm(value); }, 3000);
  };

  const handleBpmBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (bpmValidationTimerRef.current) clearTimeout(bpmValidationTimerRef.current);
    validateAndSetBpm(e.target.value);
  };

  const displayMasterVol = isMasterMuted ? 0 : masterVolume;

  return (
    <>
      <div className="playback-strip">
        {/* Click / Metronome (far left) */}
        <div className="playback-strip__group" style={{ position: 'relative' }}>
          <button
            onClick={isPlaying ? stopMetronome : startMetronome}
            className="playback-strip__transport-btn"
            aria-label={isPlaying ? 'Stop metronome' : 'Start metronome'}
            data-active={isPlaying}
          >
            {/* Metronome icon */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 1.5L6.5 22h11L12 1.5zm0 4.84L15.27 20H8.73L12 6.34z"/>
              <rect x="11" y="10" width="2" height="6" rx="1"/>
            </svg>
          </button>
          <div className="playback-strip__beat-dot" data-playing={isPlaying} />
          <button
            onClick={() => setShowClickVol(!showClickVol)}
            className="playback-strip__mute-btn"
            aria-label="Click volume"
            title="Click volume"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: clickVolume > 0 ? 1 : 0.4 }}>
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
            </svg>
          </button>
          {showClickVol && (
            <>
              <div className="playback-strip__flyout-backdrop" onClick={() => setShowClickVol(false)} />
              <div className="playback-strip__flyout">
                <label className="playback-strip__label">Click Vol</label>
                <input
                  type="range" min="0" max="1" step="0.01"
                  value={clickVolume}
                  onChange={e => setClickVolume(parseFloat(e.target.value))}
                  className="playback-strip__slider"
                  style={{ width: 80, background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${clickVolume * 100}%, var(--slider-track) ${clickVolume * 100}%, var(--slider-track) 100%)` }}
                  aria-label="Metronome click volume"
                />
                <span className="playback-strip__label" style={{ minWidth: 28, textAlign: 'right' }}>
                  {Math.round(clickVolume * 100)}%
                </span>
              </div>
            </>
          )}
        </div>

        <div className="playback-strip__sep" />

        {/* BPM */}
        <div className="playback-strip__group">
          <label htmlFor="metro-bpm" className="playback-strip__label">BPM</label>
          <div className="playback-strip__bpm-stepper">
            <button
              className="playback-strip__bpm-step"
              onClick={() => { const v = Math.max(40, bpm - 1); setBpm(v); setBpmInput(String(v)); }}
              disabled={disabled || bpm <= 40}
              aria-label="Decrease BPM"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M18 15l-6-6-6 6"/></svg>
            </button>
            <input
              id="metro-bpm"
              type="number"
              min="40"
              max="300"
              value={bpmInput}
              onChange={handleBpmChange}
              onBlur={handleBpmBlur}
              disabled={disabled}
              className="playback-strip__bpm-input"
            />
            <button
              className="playback-strip__bpm-step"
              onClick={() => { const v = Math.min(300, bpm + 1); setBpm(v); setBpmInput(String(v)); }}
              disabled={disabled || bpm >= 300}
              aria-label="Increase BPM"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M6 9l6 6 6-6"/></svg>
            </button>
          </div>
        </div>

        <div className="playback-strip__sep" />

        {/* Master volume */}
        <div className="playback-strip__group">
          <button
            onClick={() => setIsMasterMuted(!isMasterMuted)}
            className="playback-strip__mute-btn"
            data-muted={isMasterMuted || masterVolume === 0}
            aria-label={isMasterMuted ? 'Unmute' : 'Mute'}
          >
            {isMasterMuted || masterVolume === 0 ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
            )}
          </button>
          <input
            type="range" min="0" max="1" step="0.01"
            value={isMasterMuted ? 0 : masterVolume}
            onChange={e => {
              const v = parseFloat(e.target.value);
              setMasterVolume(v);
              if (v > 0) setIsMasterMuted(false);
            }}
            className="playback-strip__slider"
            style={{ background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${displayMasterVol * 100}%, var(--slider-track) ${displayMasterVol * 100}%, var(--slider-track) 100%)` }}
            aria-label="Master volume"
          />
        </div>

      </div>
    </>
  );
}
