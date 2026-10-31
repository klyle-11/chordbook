import { useState, useRef } from 'react';
import { getTuningStrings, type Tuning, type CapoSettings } from '../lib/music/tunings';
import type { FretboardFocus } from '../lib/fretboardFocus';
import FretboardDiagram, { type FretboardStyle } from './FretboardDiagram';

const DEFAULT_ROW_HEIGHT = 20;
const MIN_ROW_HEIGHT = 16;
const MAX_ROW_HEIGHT = 32;
const KEYBOARD_STEP = 2;
// Label bar, fret numbers and resize handle around the string rows
const BOARD_CHROME = 60;
const MAX_WINDOW_SHARE = 0.4;

function clampRowHeight(height: number, max = MAX_ROW_HEIGHT): number {
  return Math.min(max, Math.max(MIN_ROW_HEIGHT, Math.round(height)));
}

// Largest row height that keeps the board within its share of the window, so the progressions keep room
function fitRowHeight(stringCount: number): number {
  if (typeof window === 'undefined') return MAX_ROW_HEIGHT;
  return clampRowHeight((window.innerHeight * MAX_WINDOW_SHARE - BOARD_CHROME) / (stringCount + 1));
}

interface SongFretboardProps {
  focus: FretboardFocus | null;
  songNotes: string[];
  tuning: Tuning;
  capoSettings: CapoSettings;
  activeLeadNotes?: string[];
  collapsed: boolean;
  onToggleCollapsed: () => void;
  fretboardStyle: FretboardStyle;
  onStyleChange: (style: FretboardStyle) => void;
  /** Saved string-row height in px (undefined: default size) */
  rowHeight?: number;
  /** Called once a resize ends (drag released, arrow key, or double-click reset) */
  onRowHeightChange: (rowHeight: number) => void;
}

/**
 * The one full-neck fretboard for the open song, pinned in the song header.
 * Shows the focused chord (clicked or playing in any progression), or every
 * note in the song when nothing is focused. The handle under it resizes it
 * vertically, scaling the whole diagram, so the progressions below stay in view.
 */
export default function SongFretboard({
  focus, songNotes, tuning, capoSettings, activeLeadNotes, collapsed, onToggleCollapsed, fretboardStyle, onStyleChange,
  rowHeight, onRowHeightChange,
}: SongFretboardProps) {
  const notes = focus ? focus.chordNotes : songNotes;
  const stringCount = getTuningStrings(tuning).length;
  const maxRowHeight = fitRowHeight(stringCount);

  // Live height while dragging; the parent only hears about the final one
  const [dragRowHeight, setDragRowHeight] = useState<number | null>(null);
  const dragRef = useRef<{ startY: number; startRowHeight: number; rowHeight: number } | null>(null);
  const shownRowHeight = dragRowHeight ?? clampRowHeight(rowHeight ?? DEFAULT_ROW_HEIGHT, maxRowHeight);

  function commitRowHeight(height: number) {
    onRowHeightChange(clampRowHeight(height, maxRowHeight));
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
    setDragRowHeight(drag.rowHeight);
  }

  function handlePointerEnd() {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    commitRowHeight(drag.rowHeight);
    setDragRowHeight(null);
  }

  function handleResizeKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      commitRowHeight(shownRowHeight + (e.key === 'ArrowDown' ? KEYBOARD_STEP : -KEYBOARD_STEP));
    }
  }

  return (
    <div className="song-fretboard">
      <div className="song-fretboard__bar">
        <button
          onClick={onToggleCollapsed}
          className="song-fretboard__toggle"
          aria-expanded={!collapsed}
          title={collapsed ? 'Show fretboard' : 'Hide fretboard'}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
            style={{ transform: collapsed ? 'rotate(-90deg)' : undefined, transition: 'transform 0.15s ease' }}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        <span className="song-fretboard__label">{focus ? focus.chordName : 'Song notes'}</span>
        <span className="song-fretboard__notes">{notes.join(' ')}</span>
        {focus?.secondaryName && (
          <span className="song-fretboard__secondary">
            {focus.secondaryKind === 'mode'
              ? `mode: ${focus.secondaryName} · ${focus.secondaryNotes?.join(' ') || ''}`
              : `next: ${focus.secondaryName}`}
          </span>
        )}
        {focus?.onFretClick && (
          <span className="song-fretboard__hint">click notes to fill the tab</span>
        )}
        <button
          onClick={() => onStyleChange(fretboardStyle === 'wood' ? 'theme' : 'wood')}
          className="song-fretboard__style"
          data-active={fretboardStyle === 'wood'}
          title={fretboardStyle === 'wood' ? 'Switch to flat (theme) fretboard' : 'Switch to wood fretboard'}
        >
          {fretboardStyle === 'wood' ? 'Wood' : 'Flat'}
        </button>
      </div>
      {!collapsed && (
        notes.length > 0 ? (
          <>
            <div className="song-fretboard__neck">
              <FretboardDiagram
                compact
                rowHeight={shownRowHeight}
                variant={fretboardStyle}
                chordNotes={notes}
                tuning={tuning}
                capoSettings={capoSettings}
                voicingFrets={focus?.voicingFrets}
                secondaryNotes={focus?.secondaryNotes}
                secondaryLabel={focus?.secondaryKind === 'mode'
                  ? `Mode · ${focus.secondaryName}`
                  : `Next · ${focus?.secondaryName}`}
                onFretClick={focus?.onFretClick}
                activeLeadNotes={activeLeadNotes}
              />
            </div>
            <div
              className="song-fretboard__resize"
              role="separator"
              aria-orientation="horizontal"
              aria-label="Resize fretboard"
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
              onKeyDown={handleResizeKeyDown}
            />
          </>
        ) : (
          <div className="song-fretboard__empty">Add chords to see them on the fretboard</div>
        )
      )}
    </div>
  );
}
