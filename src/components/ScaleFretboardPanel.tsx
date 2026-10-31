import { useState, useEffect, useRef } from 'react';
import type { Song } from '../types/song';
import { DEFAULT_TUNING, getTuningStrings } from '../lib/tunings';
import { getUniqueNotesFromSong } from '../lib/songAnalysis';
import { db } from '../lib/db';
import FretboardDiagram from './FretboardDiagram';

const ROW_HEIGHT_KEY = 'scaleFretboardRowHeight';
const DEFAULT_ROW_HEIGHT = 20;
const MIN_ROW_HEIGHT = 16;
const MAX_ROW_HEIGHT = 32;
const KEYBOARD_STEP = 2;
// Header, padding, fret numbers and resize handle around the string rows
const PANEL_CHROME = 90;
const MAX_WINDOW_SHARE = 0.4;

function clampRowHeight(height: number, max = MAX_ROW_HEIGHT): number {
  return Math.min(max, Math.max(MIN_ROW_HEIGHT, Math.round(height)));
}

// Largest row height that keeps the panel within its share of the window, so the progressions keep room
function fitRowHeight(stringCount: number): number {
  const fit = Math.floor((window.innerHeight * MAX_WINDOW_SHARE - PANEL_CHROME) / (stringCount + 1));
  return clampRowHeight(fit);
}

interface ScaleFretboardPanelProps {
  song: Song;
  onClose: () => void;
}

/**
 * Song-scale fretboard docked under the song header. The bottom handle resizes it
 * vertically, scaling the whole diagram so the progressions below stay in view.
 */
export default function ScaleFretboardPanel({ song, onClose }: ScaleFretboardPanelProps) {
  const [rowHeight, setRowHeight] = useState(DEFAULT_ROW_HEIGHT);
  const dragRef = useRef<{ startY: number; startRowHeight: number; rowHeight: number } | null>(null);

  const scaleNotes = getUniqueNotesFromSong(song);
  const tuning = song.tuning || DEFAULT_TUNING;
  const stringCount = getTuningStrings(tuning).length;
  const maxRowHeight = fitRowHeight(stringCount);
  const shownRowHeight = Math.min(rowHeight, maxRowHeight);

  // Restore the saved size
  useEffect(() => {
    db.appState.get(ROW_HEIGHT_KEY)
      .then(entry => {
        const saved = Number(entry?.value);
        if (saved) setRowHeight(clampRowHeight(saved));
      })
      .catch(() => {});
  }, []);

  function commitRowHeight(height: number) {
    const next = clampRowHeight(height, maxRowHeight);
    setRowHeight(next);
    db.appState.put({ key: ROW_HEIGHT_KEY, value: String(next) });
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startY: e.clientY, startRowHeight: shownRowHeight, rowHeight: shownRowHeight };
  }

  // The handle follows the pointer: the drag distance is spread across the string rows
  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    drag.rowHeight = clampRowHeight(drag.startRowHeight + (e.clientY - drag.startY) / stringCount, maxRowHeight);
    setRowHeight(drag.rowHeight);
  }

  function handlePointerEnd() {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    commitRowHeight(drag.rowHeight);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      commitRowHeight(shownRowHeight + (e.key === 'ArrowDown' ? KEYBOARD_STEP : -KEYBOARD_STEP));
    }
  }

  return (
    <div className="scale-flyout">
      <div className="scale-flyout__header">
        <span className="scale-flyout__title">
          Scale &middot; {scaleNotes.length} note{scaleNotes.length !== 1 ? 's' : ''}
        </span>
        <div className="scale-flyout__notes">
          {scaleNotes.map(n => (
            <span key={n} className="scale-flyout__note">{n}</span>
          ))}
        </div>
        <button
          onClick={onClose}
          className="scale-flyout__close"
          aria-label="Close scale"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      {scaleNotes.length > 0 ? (
        <>
          <div className="scale-flyout__fretboard">
            <FretboardDiagram
              chordNotes={scaleNotes}
              tuning={tuning}
              capoSettings={song.capoSettings || { fret: 0, enabled: false }}
              rowHeight={shownRowHeight}
              hideTitle
            />
          </div>
          <div
            className="scale-flyout__resize"
            role="separator"
            aria-orientation="horizontal"
            aria-label="Resize scale fretboard"
            aria-valuemin={MIN_ROW_HEIGHT}
            aria-valuemax={maxRowHeight}
            aria-valuenow={shownRowHeight}
            tabIndex={0}
            title="Drag to resize · double-click to reset"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
            onDoubleClick={() => commitRowHeight(DEFAULT_ROW_HEIGHT)}
            onKeyDown={handleKeyDown}
          />
        </>
      ) : (
        <div className="scale-flyout__empty">Add chords to see scale notes</div>
      )}
    </div>
  );
}
