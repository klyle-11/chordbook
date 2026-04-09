import { useState, useRef } from 'react';
import type { Tuning } from '../lib/tunings';
import type { ChordVoicing } from '../types/chord';
import { isValidChord, getChordSuggestions, getNotesForChord, findChordByNotes } from '../lib/chordUtils';
import { parseChordInput, addCustomChord } from '../lib/customChordLibrary';
import { getNotesFromVoicing } from '../lib/fretUtils';

type Mode = 'name' | 'tab';

interface AddChordPanelProps {
  tuning: Tuning;
  onAddChord: (chordName: string) => void | Promise<void>;
  onAddVoicing: (name: string, notes: string[], voicing: ChordVoicing) => void;
  onClose: () => void;
}

export function AddChordPanel({ tuning, onAddChord, onAddVoicing, onClose }: AddChordPanelProps) {
  const [mode, setMode] = useState<Mode>('name');
  const [nameInput, setNameInput] = useState('');
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [frets, setFrets] = useState<(number | null)[]>(() => Array(tuning.displayStrings.length).fill(null));
  const nameRef = useRef<HTMLInputElement>(null);

  const derivedNotes = getNotesFromVoicing(tuning, frets);
  const hasAnyFret = frets.some(f => f !== null);

  function switchMode(m: Mode) {
    setMode(m);
    setError('');
    setSuggestions([]);
  }

  function handleNameChange(value: string) {
    setNameInput(value);
    setError('');
    setSuggestions([]);
    if (mode !== 'name') setMode('name');
  }

  function handleFretChange(index: number, value: string) {
    if (mode !== 'tab') setMode('tab');
    const newFrets = [...frets];
    if (value === '' || value.toLowerCase() === 'x') {
      newFrets[index] = null;
    } else {
      const num = parseInt(value, 10);
      if (!isNaN(num) && num >= 0 && num <= 24) {
        newFrets[index] = num;
      }
    }
    setFrets(newFrets);
    setError('');
  }

  async function handleSubmit() {
    if (mode === 'name') {
      const trimmed = nameInput.trim();
      if (!trimmed) return;
      const { isCustomChord, notes } = parseChordInput(trimmed);
      if (isCustomChord) {
        const existing = findChordByNotes(notes);
        if (existing) {
          await onAddChord(existing);
        } else {
          const success = addCustomChord(trimmed, notes);
          if (success) {
            await onAddChord(trimmed);
          } else {
            setError(`Notes "${notes.join(', ')}" already exist in library.`);
            return;
          }
        }
      } else if (isValidChord(trimmed)) {
        await onAddChord(trimmed);
      } else {
        setSuggestions(getChordSuggestions(trimmed));
        setError(`"${trimmed}" not found.`);
        return;
      }
    } else {
      if (!hasAnyFret) return;
      const uniqueNotes = [...new Set(derivedNotes)];
      const existingName = findChordByNotes(uniqueNotes);
      const name = existingName || (uniqueNotes.length > 0 ? `[${uniqueNotes.join(', ')}]` : 'New Voicing');
      onAddVoicing(name, existingName ? getNotesForChord(existingName) : uniqueNotes, { frets: [...frets], tuningId: tuning.id });
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  }

  const namePreview = (() => {
    const trimmed = nameInput.trim();
    if (!trimmed) return null;
    const { isCustomChord, notes } = parseChordInput(trimmed);
    if (isCustomChord) {
      const existing = findChordByNotes(notes);
      if (existing) return `${existing} = ${getNotesForChord(existing).join(', ')}`;
      return notes.join(', ');
    }
    if (isValidChord(trimmed)) return getNotesForChord(trimmed).join(', ');
    return null;
  })();

  const canSubmit = mode === 'name' ? nameInput.trim().length > 0 : hasAnyFret;

  return (
    <div className="mb-3 rounded-lg p-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Add Chord</span>
        <button
          onClick={onClose}
          className="text-xs transition-colors"
          style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          Close
        </button>
      </div>

      {/* Side by side: name input | TAB editor */}
      <div className="flex gap-3 items-stretch">
        {/* Name input column */}
        <div
          className="flex-1 min-w-0 rounded-lg p-2 cursor-pointer transition-opacity"
          style={{
            background: 'var(--bg-card)',
            border: `1px solid ${mode === 'name' ? 'var(--accent)' : 'var(--border)'}`,
            opacity: mode === 'name' ? 1 : 0.4,
          }}
          onClick={() => { switchMode('name'); nameRef.current?.focus(); }}
        >
          <div className="text-xs font-medium mb-1" style={{ color: mode === 'name' ? 'var(--accent)' : 'var(--text-muted)' }}>
            By Name
          </div>
          <input
            ref={nameRef}
            type="text"
            value={nameInput}
            onChange={e => handleNameChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => switchMode('name')}
            placeholder="Am7, [C,E,G]"
            disabled={mode !== 'name'}
            className="w-full px-2 py-1 text-sm rounded"
            style={{
              background: mode === 'name' ? 'var(--bg-secondary)' : 'var(--bg-card)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              outline: 'none',
            }}
          />
          {mode === 'name' && namePreview && (
            <div className="mt-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
              {namePreview}
            </div>
          )}
        </div>

        {/* TAB input column */}
        <div
          className="flex-1 min-w-0 rounded-lg p-2 cursor-pointer transition-opacity"
          style={{
            background: 'var(--bg-card)',
            border: `1px solid ${mode === 'tab' ? 'var(--accent)' : 'var(--border)'}`,
            opacity: mode === 'tab' ? 1 : 0.4,
          }}
          onClick={() => switchMode('tab')}
        >
          <div className="text-xs font-medium mb-1" style={{ color: mode === 'tab' ? 'var(--accent)' : 'var(--text-muted)' }}>
            By TAB
          </div>
          <div className="space-y-0.5">
            {tuning.displayStrings.map((stringName, i) => (
              <div key={i} className="flex items-center gap-0.5">
                <span className="text-xs font-mono" style={{ color: 'var(--text-muted)', width: 14, textAlign: 'right' }}>
                  {stringName}
                </span>
                <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                <input
                  type="text"
                  value={frets[i] === null ? '' : String(frets[i])}
                  onChange={e => handleFretChange(i, e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => switchMode('tab')}
                  placeholder="X"
                  disabled={mode !== 'tab'}
                  className="text-center text-xs py-0.5 rounded font-mono"
                  style={{
                    width: 26,
                    background: mode === 'tab' ? 'var(--bg-secondary)' : 'var(--bg-card)',
                    color: frets[i] === null ? 'var(--text-muted)' : 'var(--text)',
                    border: '1px solid var(--border)',
                    outline: 'none',
                  }}
                />
              </div>
            ))}
          </div>
          {mode === 'tab' && hasAnyFret && (
            <div className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              {derivedNotes.join(', ')}
            </div>
          )}
        </div>
      </div>

      {/* Error / suggestions */}
      {error && (
        <div className="mt-2 px-2 py-1 rounded text-xs" style={{ color: 'var(--danger, #ef4444)' }}>
          {error}
          {suggestions.length > 0 && (
            <span className="ml-2">
              Try:{' '}
              {suggestions.map(s => (
                <button
                  key={s}
                  onClick={() => { setNameInput(s); setError(''); setSuggestions([]); }}
                  className="ml-1 px-1.5 py-0.5 rounded text-xs font-medium"
                  style={{ background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer' }}
                >
                  {s}
                </button>
              ))}
            </span>
          )}
        </div>
      )}

      {/* Submit */}
      <div className="mt-2 flex items-center gap-2">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="text-sm font-medium rounded px-3 py-1 transition-colors"
          style={{
            background: canSubmit ? 'var(--accent)' : 'var(--bg-card)',
            color: canSubmit ? '#fff' : 'var(--text-muted)',
            border: '1px solid var(--border)',
            cursor: canSubmit ? 'pointer' : 'default',
            opacity: canSubmit ? 1 : 0.5,
          }}
        >
          Add Chord
        </button>
      </div>
    </div>
  );
}
