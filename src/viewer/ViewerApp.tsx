import { useState, useMemo } from 'react';
import type { SongFile } from '../lib/songFile';
import type { TimeSignature } from '../types/song';
import { DEFAULT_TUNING, type Tuning, type CapoSettings } from '../lib/music/tunings';
import { applyTheme, getThemeById, type Theme } from '../lib/theme';
import { analyzeProgression, type ProgressionAnalysis } from '../lib/harmonicAnalysis';
import { getUniqueNotesFromSong } from '../lib/songAnalysis';
import { FretboardFocusContext, type FretboardFocus } from '../lib/fretboardFocus';
import { IntegratedMetronome } from '../components/IntegratedMetronome';
import { TimeSignatureSelector } from '../components/TimeSignatureSelector';
import { InstrumentSelector } from '../components/InstrumentSelector';
import ThemePicker from '../components/ThemePicker';
import TuningSelector from '../components/TuningSelector';
import SongLinks from '../components/SongLinks';
import SongFretboard from '../components/SongFretboard';
import SongProgressions from '../components/SongProgressions';
import type { FretboardStyle } from '../components/FretboardDiagram';

// Editing handlers SongProgressions requires; its readOnly mode never calls them
const noop = () => {};
const noPairing = () => null;

/**
 * The song page of the app for one exported song: everything can be viewed, played and
 * re-pitched (tuning, capo, tempo, theme), nothing is saved and the song can't be edited.
 */
export default function ViewerApp({ file }: { file: SongFile }) {
  const { song, leads } = file;
  const [currentTuning, setCurrentTuning] = useState<Tuning>(song.tuning || DEFAULT_TUNING);
  const [capoSettings, setCapoSettings] = useState<CapoSettings>(song.capoSettings || { fret: 0, enabled: false });
  const [currentBpm, setCurrentBpm] = useState<number>(song.bpm || 120);
  const [currentTheme, setCurrentTheme] = useState<Theme>(() => getThemeById(file.themeId ?? ''));
  const [currentTimeSignature, setCurrentTimeSignature] = useState<TimeSignature>(song.timeSignature || { beatsPerMeasure: 4, beatUnit: 4 });
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);
  const [analysisEnabled, setAnalysisEnabled] = useState(false);
  // Chord shown on the song-header fretboard (published by the progression grids)
  const [fretFocus, setFretFocus] = useState<FretboardFocus | null>(null);
  const [fretboardCollapsed, setFretboardCollapsed] = useState(false);
  const [fretboardStyle, setFretboardStyle] = useState<FretboardStyle>('theme');
  const [fretboardRowHeight, setFretboardRowHeight] = useState<number | undefined>();
  const fretboardFocusValue = useMemo(() => ({ focus: fretFocus, setFocus: setFretFocus }), [fretFocus]);

  function handleThemeChange(theme: Theme) {
    applyTheme(theme);
    setCurrentTheme(theme);
  }

  const activeLead = activeLeadId ? leads.find(l => l.id === activeLeadId) ?? null : null;
  const activeLeadNotes = useMemo(
    () => activeLead ? [...new Set(activeLead.notes.map(n => n.note))] : [],
    [activeLead]
  );

  const progressionAnalysis = useMemo((): ProgressionAnalysis | null => {
    const allChords = song.progressions.flatMap(p => p.chords);
    if (allChords.length === 0) return null;
    return analyzeProgression(allChords);
  }, [song.progressions]);

  const songNotes = useMemo(() => getUniqueNotesFromSong(song), [song]);
  const links = song.links || [];

  return (
    <FretboardFocusContext.Provider value={fretboardFocusValue}>
    <div className="app-shell" style={{ background: 'var(--bg)', color: 'var(--text)' }}>

      {/* ─── Sticky Header ─── */}
      <div className="sticky-header">
        {/* Brand row */}
        <header className="sticky-header__brand">
          <div className="app-container flex items-center justify-between py-5">
            <h1
              className="text-xl font-bold"
              style={{ fontFamily: 'var(--font-body)', color: 'var(--text)', letterSpacing: '-0.02em' }}
            >
              Chordbook
            </h1>
            <ThemePicker currentTheme={currentTheme} onThemeChange={handleThemeChange} />
          </div>
        </header>

        {/* Toolbar row */}
        <div className="sticky-header__toolbar">
          <div className="app-container py-2">
            <div className="toolbar-row">
              <IntegratedMetronome
                onTempoChange={setCurrentBpm}
                currentBpm={currentBpm}
                timeSignature={currentTimeSignature}
              />
              <TimeSignatureSelector
                timeSignature={currentTimeSignature}
                onChange={setCurrentTimeSignature}
              />
              <InstrumentSelector />
            </div>
          </div>
        </div>

        {/* Song info row */}
        <div className="sticky-header__song-info">
          <div className="app-container">
            <div className="song-header">
              <div className="song-header__left">
                <span className="song-header__title">{song.name}</span>
                {links.length > 0 && <SongLinks links={links} />}
              </div>
              <div className="song-header__meta">
                <span className="song-header__meta-item">
                  {song.progressions.length} prog{song.progressions.length !== 1 ? 's' : ''}
                </span>
              </div>
              <TuningSelector
                currentTuning={currentTuning}
                onTuningChange={setCurrentTuning}
                capoSettings={capoSettings}
                onCapoChange={setCapoSettings}
                voicedChordCount={song.progressions.reduce(
                  (n, p) => n + p.chords.filter(c => c.voicing?.tuningId === currentTuning.id).length, 0
                )}
              />
            </div>
            <SongFretboard
              focus={fretFocus}
              songNotes={songNotes}
              tuning={currentTuning}
              capoSettings={capoSettings}
              activeLeadNotes={activeLeadNotes}
              collapsed={fretboardCollapsed}
              onToggleCollapsed={() => setFretboardCollapsed(!fretboardCollapsed)}
              fretboardStyle={fretboardStyle}
              onStyleChange={setFretboardStyle}
              rowHeight={fretboardRowHeight}
              onRowHeightChange={setFretboardRowHeight}
            />
          </div>
        </div>
      </div>

      {/* ─── Main Content ─── */}
      <main className="app-shell__content">
        <div className="app-container py-8 space-y-8">
          <section>
            <SongProgressions
              readOnly
              progressions={song.progressions}
              pairings={song.pairings || []}
              timeSignature={currentTimeSignature}
              onReorderProgressions={noop}
              onEditProgression={noop}
              onUpdateProgressionBpm={noop}
              onDeleteProgression={noop}
              onChordReorder={noop}
              onChordRename={noop}
              onChordRemove={noop}
              onUpdateChordVoicing={noop}
              onAddChord={noop}
              onAddChordWithVoicing={noop}
              onUpdateChordBeats={noop}
              onCreatePairing={noPairing}
              onDeletePairing={noop}
              onRenamePairing={noop}
              onReorderPairingProgressions={noop}
              tuning={currentTuning}
              capoSettings={capoSettings}
              bpm={currentBpm}
              songLeadIds={song.leadIds || []}
              allLeads={leads}
              activeLeadId={activeLeadId}
              activeLeadNotes={activeLeadNotes}
              onActivateLead={setActiveLeadId}
              onCreateLead={noop}
              onDeleteLead={noop}
              onAssociateLeadWithSong={noop}
              onDissociateLeadFromSong={noop}
              songName={song.name}
              analysisEnabled={analysisEnabled}
              progressionAnalysis={progressionAnalysis}
              onToggleAnalysis={() => setAnalysisEnabled(!analysisEnabled)}
              forceModeOverlay
            />
          </section>
        </div>
      </main>

      {/* ─── Footer ─── */}
      <footer className="app-shell__footer">
        Read-only copy, exported {file.exportedAt.toLocaleDateString()} · import this file in Chordbook to edit it
      </footer>
    </div>
    </FretboardFocusContext.Provider>
  );
}
