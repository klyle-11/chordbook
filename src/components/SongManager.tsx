import { useState } from 'react';
import type { Song } from '../types/song';
import { EditableText } from './EditableText';
import { DEFAULT_TUNING } from '../lib/tunings';
import PDFExportDialog from './PDFExportDialog';
import FretboardDiagram from './FretboardDiagram';
import { getUniqueNotesFromSong } from '../lib/songAnalysis';

interface SongManagerProps {
  songs: Song[];
  currentSong: Song | null;
  onSelectSong: (song: Song) => void;
  onCreateSong: (name: string) => void;
  onRenameSong: (songId: string, newName: string) => void;
  onDeleteSong: (songId: string) => void;
  onBackToOverview: () => void;
}

export default function SongManager({
  songs,
  currentSong,
  onSelectSong,
  onCreateSong,
  onRenameSong,
  onDeleteSong,
  onBackToOverview
}: SongManagerProps) {
  const [showNewSongForm, setShowNewSongForm] = useState(false);
  const [newSongName, setNewSongName] = useState('');
  const [songToDelete, setSongToDelete] = useState<string | null>(null);
  const [showPDFExport, setShowPDFExport] = useState(false);
  const [showAllSongs, setShowAllSongs] = useState(false);
  const [showScaleFlyout, setShowScaleFlyout] = useState(false);

  const sortedSongs = [...songs].sort((a, b) => {
    const aLast = a.lastOpened?.getTime() || 0;
    const bLast = b.lastOpened?.getTime() || 0;
    return bLast - aLast;
  });

  const recentSongs = sortedSongs.slice(0, 4);
  const remainingSongs = sortedSongs.slice(4);

  const handleCreateSong = () => {
    if (newSongName.trim()) {
      onCreateSong(newSongName.trim());
      setNewSongName('');
      setShowNewSongForm(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCreateSong();
    else if (e.key === 'Escape') {
      setShowNewSongForm(false);
      setNewSongName('');
    }
  };

  const renderSongCard = (song: Song, showBpmTuning = false) => (
    <div
      key={song.id}
      onClick={() => onSelectSong(song)}
      className="themed-card themed-card-interactive p-6"
    >
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-base font-semibold truncate flex-1 pr-2" style={{ fontFamily: 'var(--font-body)', color: 'var(--card-text)' }}>
          {song.name}
        </h3>
        <button
          onClick={(e) => { e.stopPropagation(); setSongToDelete(song.id); }}
          className="p-1 transition-colors flex-shrink-0"
          style={{ color: 'var(--card-text-muted)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--danger)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--card-text-muted)')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      <p className="text-sm mb-2" style={{ color: 'var(--card-text-secondary)' }}>
        {song.progressions.length} progression{song.progressions.length !== 1 ? 's' : ''}
      </p>
      {song.lastOpened && (
        <p className="text-xs mb-2" style={{ color: 'var(--card-text-muted)' }}>
          Last opened {song.lastOpened.toLocaleDateString()}
        </p>
      )}

      {showBpmTuning && (
        <p className="text-xs mb-2" style={{ color: 'var(--card-text-muted)' }}>
          {song.bpm || 120} BPM &middot; {song.tuning?.name || DEFAULT_TUNING.name}
        </p>
      )}

      {song.progressions.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {song.progressions.slice(0, 3).map((prog, i) => (
            <span key={i} className="themed-tag">{prog.name}</span>
          ))}
          {song.progressions.length > 3 && (
            <span className="themed-tag" style={{ opacity: 0.7 }}>+{song.progressions.length - 3}</span>
          )}
        </div>
      )}
    </div>
  );

  // ─── Song Detail View (compact single-row for sticky header) ───
  if (currentSong) {
    return (
      <div style={{ position: 'relative' }}>
        <div className="song-header">
          {/* Left: back + title */}
          <div className="song-header__left">
            <button
              onClick={onBackToOverview}
              className="song-header__back"
              aria-label="Back to all songs"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <EditableText
              value={currentSong.name}
              onChange={(name) => onRenameSong(currentSong.id, name)}
              className="song-header__title"
              placeholder="Song name..."
            />
          </div>

          {/* Center: meta info */}
          <div className="song-header__meta">
            <span className="song-header__meta-item">
              {currentSong.progressions.length} prog{currentSong.progressions.length !== 1 ? 's' : ''}
            </span>
            <span className="song-header__meta-sep" />
            <span className="song-header__meta-item">
              {currentSong.bpm || 120} BPM
            </span>
          </div>

          {/* Right: actions */}
          <div className="song-header__actions">
            <button
              onClick={() => setShowScaleFlyout(!showScaleFlyout)}
              className="song-header__action-btn"
              title="Song scale"
              data-active={showScaleFlyout}
              style={showScaleFlyout ? { background: 'var(--accent-subtle)', color: 'var(--accent)' } : undefined}
            >
              {/* Fretboard icon */}
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                {/* Fretboard outline */}
                <rect x="3" y="4" width="18" height="16" rx="2" />
                {/* Frets */}
                <line x1="7.5" y1="4" x2="7.5" y2="20" />
                <line x1="12" y1="4" x2="12" y2="20" />
                <line x1="16.5" y1="4" x2="16.5" y2="20" />
                {/* Strings */}
                <line x1="3" y1="8" x2="21" y2="8" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="16" x2="21" y2="16" />
                {/* Dots */}
                <circle cx="9.75" cy="10" r="1.2" fill="currentColor" stroke="none" />
                <circle cx="14.25" cy="14" r="1.2" fill="currentColor" stroke="none" />
              </svg>
            </button>
            <button
              onClick={() => setShowPDFExport(true)}
              className="song-header__action-btn"
              title="Export PDF"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="song-header__action-label">PDF</span>
            </button>
            <button
              onClick={() => setSongToDelete(currentSong.id)}
              className="song-header__action-btn song-header__action-btn--danger"
              title="Delete song"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scale Flyout */}
        {showScaleFlyout && (() => {
          const scaleNotes = getUniqueNotesFromSong(currentSong);
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
                  onClick={() => setShowScaleFlyout(false)}
                  className="scale-flyout__close"
                  aria-label="Close scale"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {scaleNotes.length > 0 ? (
                <div className="scale-flyout__fretboard">
                  <FretboardDiagram
                    chordNotes={scaleNotes}
                    tuning={currentSong.tuning || DEFAULT_TUNING}
                    capoSettings={currentSong.capoSettings || { fret: 0, enabled: false }}
                  />
                </div>
              ) : (
                <div className="scale-flyout__empty">Add chords to see scale notes</div>
              )}
            </div>
          );
        })()}

        {renderDeleteDialog()}

        <PDFExportDialog
          song={currentSong}
          isOpen={showPDFExport}
          onClose={() => setShowPDFExport(false)}
        />
      </div>
    );
  }

  // ─── Song Overview ───
  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold" style={{ fontFamily: 'var(--font-body)', color: 'var(--text)' }}>
          Songs
        </h2>
        <button onClick={() => setShowNewSongForm(true)} className="themed-btn-primary flex items-center justify-center gap-2 w-full sm:w-auto">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Song
        </button>
      </div>

      {showNewSongForm && (
        <div className="mb-6 p-4 rounded-xl" style={{ background: 'var(--accent-subtle)', border: '1px solid var(--border)' }}>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="text"
              value={newSongName}
              onChange={(e) => setNewSongName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter song name..."
              className="themed-input flex-1"
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={handleCreateSong} disabled={!newSongName.trim()} className="themed-btn-primary flex-1 sm:flex-none">
                Create
              </button>
              <button onClick={() => { setShowNewSongForm(false); setNewSongName(''); }} className="themed-btn-secondary flex-1 sm:flex-none">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {songs.length === 0 ? (
        <div className="text-center py-16 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
          <p className="text-lg mb-2" style={{ color: 'var(--text-secondary)' }}>No songs yet</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Create your first song to get started</p>
        </div>
      ) : (
        <div className="space-y-8">
          {recentSongs.length > 0 && (
            <div>
              <h3 className="text-base font-semibold mb-4" style={{ fontFamily: 'var(--font-body)', color: 'var(--text-secondary)' }}>
                Recent
              </h3>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                {recentSongs.map(song => renderSongCard(song))}
              </div>
            </div>
          )}

          {remainingSongs.length > 0 && (
            <div>
              <button
                onClick={() => setShowAllSongs(!showAllSongs)}
                className="flex items-center gap-2 text-base font-semibold mb-4 transition-colors"
                style={{ fontFamily: 'var(--font-body)', color: 'var(--text-secondary)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
              >
                <svg className={`w-4 h-4 transition-transform ${showAllSongs ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                All Songs ({remainingSongs.length})
              </button>
              {showAllSongs && (
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {remainingSongs.map(song => renderSongCard(song, true))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {renderDeleteDialog()}
    </div>
  );

  function renderDeleteDialog() {
    if (!songToDelete) return null;
    const songData = songs.find(s => s.id === songToDelete);

    return (
      <div className="fixed inset-0 themed-overlay flex items-center justify-center z-50 p-4">
        <div className="themed-dialog p-6 max-w-md w-full animate-fade-in">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--danger-subtle)' }}>
              <svg className="w-5 h-5" style={{ color: 'var(--danger)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-1.964-.833-2.732 0l-8.998 10c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-body)', color: 'var(--text)' }}>Delete Song</h3>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>This action cannot be undone</p>
            </div>
          </div>

          {songData && (
            <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
              Are you sure you want to delete "<strong>{songData.name}</strong>"?
              This will remove {songData.progressions.length} progression{songData.progressions.length !== 1 ? 's' : ''}.
            </p>
          )}

          <div className="flex gap-3 justify-end">
            <button onClick={() => setSongToDelete(null)} className="themed-btn-secondary">Cancel</button>
            <button onClick={() => { if (songToDelete) { onDeleteSong(songToDelete); setSongToDelete(null); } }} className="themed-btn-danger">Delete</button>
          </div>
        </div>
      </div>
    );
  }
}
