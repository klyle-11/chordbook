import type { Tuning, CapoSettings } from '../lib/music/tunings';
import type { FretboardFocus } from '../lib/fretboardFocus';
import FretboardDiagram, { type FretboardStyle } from './FretboardDiagram';

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
}

/**
 * The one full-neck fretboard for the open song, pinned in the song header.
 * Shows the focused chord (clicked or playing in any progression), or every
 * note in the song when nothing is focused.
 */
export default function SongFretboard({
  focus, songNotes, tuning, capoSettings, activeLeadNotes, collapsed, onToggleCollapsed, fretboardStyle, onStyleChange,
}: SongFretboardProps) {
  const notes = focus ? focus.chordNotes : songNotes;

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
          <div className="song-fretboard__neck">
            <FretboardDiagram
              compact
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
        ) : (
          <div className="song-fretboard__empty">Add chords to see them on the fretboard</div>
        )
      )}
    </div>
  );
}
