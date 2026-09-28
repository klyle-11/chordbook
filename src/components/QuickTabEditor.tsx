import { useEffect, useRef, useState } from 'react';
import type { Tuning } from '../lib/tunings';
import { getNoteAtFret, getNotesFromVoicing, getFretsForNoteOnString } from '../lib/fretUtils';
import { suggestRenameForTab } from '../lib/chordUtils';
import { audioPlayer } from '../lib/audioPlayer';

type Frets = (number | null)[];

interface QuickTabEditorProps {
  /** Sounding (capo-applied) tuning — frets are capo-relative */
  tuning: Tuning;
  chordName: string;
  chordNotes: string[];
  initialFrets?: Frets;
  onApply: (frets: Frets, renameTo?: string) => void;
  onClose: () => void;
  /** Open the full editor (fretboard fill, save to library) */
  onMore?: () => void;
}

const MAX_FRET = 24;
const TWO_DIGIT_WINDOW_MS = 900;

/**
 * Compact keyboard-first tab editor that pops over a chord card.
 * Type digits, ↑/↓ to change string, ←/→ to nudge the fret, x to mute,
 * a–g for a note, Space to hear it, Enter to apply, Esc / click away to cancel.
 */
export default function QuickTabEditor({
  tuning, chordName, chordNotes, initialFrets, onApply, onClose, onMore,
}: QuickTabEditorProps) {
  const stringCount = tuning.displayStrings.length;
  const [frets, setFrets] = useState<Frets>(() =>
    initialFrets && initialFrets.length === stringCount ? [...initialFrets] : Array(stringCount).fill(null)
  );
  // Start on the lowest string: chord shapes are usually read bass → treble
  const [cursor, setCursor] = useState(stringCount - 1);
  const [renameAccepted, setRenameAccepted] = useState(true);
  const lastDigit = useRef<{ string: number; value: number; at: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => { panelRef.current?.focus(); }, []);

  const tabNotes = getNotesFromVoicing(tuning, frets);
  const rename = suggestRenameForTab(chordNotes, tabNotes);
  const renameTo = rename && renameAccepted ? rename.suggestedName : undefined;
  const canApply = frets.some(f => f !== null);

  function setFret(stringIndex: number, value: number | null) {
    setFrets(prev => prev.map((f, i) => (i === stringIndex ? value : f)));
  }

  function move(delta: number) {
    lastDigit.current = null;
    setCursor(c => Math.max(0, Math.min(stringCount - 1, c + delta)));
  }

  function strum() {
    const delay = audioPlayer.getStrumDelay();
    frets
      .map((fret, stringIndex) => ({ fret, stringIndex }))
      .filter((e): e is { fret: number; stringIndex: number } => e.fret !== null)
      .reverse() // low string first
      .forEach(({ fret, stringIndex }, i) => {
        const open = tuning.displayStrings[stringIndex];
        setTimeout(() => audioPlayer.playNote(getNoteAtFret(open, fret), 1.2, open, fret, stringIndex, tuning), i * delay);
      });
  }

  function typeDigit(d: number) {
    const now = Date.now();
    const prev = lastDigit.current;
    // Second digit on the same string shortly after the first → two-digit fret (e.g. 1 then 2 = 12)
    // No auto-advance: "2" then "0" must stay unambiguous (20 vs. 2 and 0), so strings
    // are changed explicitly with ↑/↓/Tab.
    if (prev && prev.string === cursor && now - prev.at < TWO_DIGIT_WINDOW_MS && prev.value * 10 + d <= MAX_FRET) {
      setFret(cursor, prev.value * 10 + d);
      lastDigit.current = null;
      return;
    }
    setFret(cursor, d);
    lastDigit.current = d * 10 > MAX_FRET ? null : { string: cursor, value: d, at: now };
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    const key = e.key;
    if (/^[0-9]$/.test(key)) {
      typeDigit(parseInt(key, 10));
    } else if (key === 'ArrowUp' || (key === 'Tab' && e.shiftKey)) {
      move(-1);
    } else if (key === 'ArrowDown' || key === 'Tab') {
      move(1);
    } else if (key === 'ArrowRight' || key === '+' || key === '=') {
      setFret(cursor, Math.min(MAX_FRET, (frets[cursor] ?? -1) + 1));
    } else if (key === 'ArrowLeft' || key === '-') {
      const f = frets[cursor];
      setFret(cursor, f === null || f === 0 ? null : f - 1);
    } else if (key === 'x' || key === 'X' || key === 'Backspace' || key === 'Delete') {
      setFret(cursor, null);
      lastDigit.current = null;
    } else if (/^[a-gA-G]$/.test(key)) {
      const fret = getFretsForNoteOnString(tuning.displayStrings[cursor], key.toUpperCase(), 12)[0];
      if (fret !== undefined) setFret(cursor, fret);
    } else if (key === ' ') {
      strum();
    } else if (key === 'Enter') {
      if (canApply) onApply(frets, renameTo);
    } else if (key === 'Escape') {
      onClose();
    } else {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
  }

  return (
    <>
      {/* Click-away backdrop */}
      <div
        className="fixed inset-0 z-40"
        onMouseDown={(e) => { e.stopPropagation(); onClose(); }}
        onClick={(e) => e.stopPropagation()}
      />
      <div
        ref={panelRef}
        tabIndex={0}
        role="dialog"
        aria-label={`Edit tab for ${chordName}`}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        className="quick-tab"
      >
        <div className="quick-tab__header">
          <span className="quick-tab__title">{chordName}</span>
          <span className="quick-tab__notes">{[...new Set(tabNotes)].join(' ')}</span>
        </div>

        <div className="quick-tab__rows">
          {tuning.displayStrings.map((openNote, i) => {
            const fret = frets[i];
            const active = i === cursor;
            return (
              <div
                key={i}
                className={`quick-tab__row ${active ? 'quick-tab__row--active' : ''}`}
                onMouseDown={(e) => { e.preventDefault(); setCursor(i); lastDigit.current = null; panelRef.current?.focus(); }}
              >
                <span className="quick-tab__string">{openNote}</span>
                <span className="quick-tab__line" />
                <span className={`quick-tab__fret ${fret === null ? 'quick-tab__fret--muted' : ''}`}>
                  {fret === null ? 'x' : fret}
                </span>
                <span className="quick-tab__line" />
                <span className="quick-tab__note">{fret === null ? '' : getNoteAtFret(openNote, fret)}</span>
              </div>
            );
          })}
        </div>

        {rename && (
          <label className="quick-tab__rename">
            <input
              type="checkbox"
              checked={renameAccepted}
              onChange={e => { setRenameAccepted(e.target.checked); panelRef.current?.focus(); }}
              style={{ accentColor: 'var(--accent)' }}
            />
            Rename to <strong>{rename.suggestedName}</strong>
          </label>
        )}

        <div className="quick-tab__actions">
          <button className="quick-tab__btn quick-tab__btn--primary" disabled={!canApply} onClick={() => onApply(frets, renameTo)}>
            Apply ⏎
          </button>
          <button className="quick-tab__btn" onClick={strum} title="Play (Space)">▶</button>
          {onMore && <button className="quick-tab__btn" onClick={onMore} title="Full editor with fretboard">More…</button>}
        </div>
        <div className="quick-tab__hint">0–24 · ↑↓ string · ←→ ±1 · x mute · A–G note · Space play · Esc</div>
      </div>
    </>
  );
}
