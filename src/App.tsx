import { useState, useEffect } from 'react'
import { getNotesForChord } from './lib/chordUtils';
import type { Song, TimeSignature, ChordPairing } from './types/song';
import type { ChordVoicing } from './types/chord';
import { DEFAULT_TUNING, type Tuning, type CapoSettings } from './lib/tunings';
import {
  saveSongs,
  saveCurrentSong,
  loadSongsAsync,
  loadCurrentSongAsync,
  migrateLocalStorageToDB,
  generateSongId,
  generateProgressionId,
  generatePairingId,
  updateProgressionBpm
} from './lib/songStorage';
import { loadTheme, saveTheme, applyTheme, type Theme, themes } from './lib/theme';
import { findVoicingsForNotes } from './lib/savedVoicingLibrary';

import BackupManager from './components/BackupManager';
import SongScale from './components/SongScale';
import TuningSelector from './components/TuningSelector';
import { IntegratedMetronome } from './components/IntegratedMetronome';
import SongManager from './components/SongManager';
import SongProgressions from './components/SongProgressions';
import ThemePicker from './components/ThemePicker';
import { TimeSignatureSelector } from './components/TimeSignatureSelector';

function App() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentSongId, setCurrentSongId] = useState<string | null>(null);
  const [currentTuning, setCurrentTuning] = useState<Tuning>(DEFAULT_TUNING);
  const [capoSettings, setCapoSettings] = useState<CapoSettings>({ fret: 0, enabled: false });
  const [currentBpm, setCurrentBpm] = useState<number>(120);
  const [currentTheme, setCurrentTheme] = useState<Theme>(themes[0]);
  const [currentTimeSignature, setCurrentTimeSignature] = useState<TimeSignature>({ beatsPerMeasure: 4, beatUnit: 4 });

  useEffect(() => {
    async function init() {
      const theme = await loadTheme();
      applyTheme(theme);
      setCurrentTheme(theme);

      await migrateLocalStorageToDB();
      const loadedSongs = await loadSongsAsync();
      setSongs(loadedSongs);

      const currentId = await loadCurrentSongAsync();
      if (currentId) {
        setCurrentSongId(currentId);
        const song = loadedSongs.find(s => s.id === currentId);
        if (song) {
          setCurrentTuning(song.tuning || DEFAULT_TUNING);
          setCapoSettings(song.capoSettings || { fret: 0, enabled: false });
          setCurrentBpm(song.bpm || 120);
          setCurrentTimeSignature(song.timeSignature || { beatsPerMeasure: 4, beatUnit: 4 });
        }
      }
    }
    init();
  }, []);

  function handleThemeChange(theme: Theme) {
    applyTheme(theme);
    setCurrentTheme(theme);
    saveTheme(theme.id);
  }

  function handleTuningChange(tuning: Tuning) {
    setCurrentTuning(tuning);
    if (!currentSongId) return;
    setSongs(prevSongs => {
      const updatedSongs = prevSongs.map(song =>
        song.id === currentSongId ? { ...song, tuning, updatedAt: new Date() } : song
      );
      saveSongs(updatedSongs);
      return updatedSongs;
    });
  }

  function handleCapoChange(capo: CapoSettings) {
    setCapoSettings(capo);
    if (!currentSongId) return;
    setSongs(prevSongs => {
      const updatedSongs = prevSongs.map(song =>
        song.id === currentSongId ? { ...song, capoSettings: capo, updatedAt: new Date() } : song
      );
      saveSongs(updatedSongs);
      return updatedSongs;
    });
  }

  function handleTimeSignatureChange(ts: TimeSignature) {
    setCurrentTimeSignature(ts);
    if (!currentSongId) return;
    setSongs(prevSongs => {
      const updatedSongs = prevSongs.map(song =>
        song.id === currentSongId ? { ...song, timeSignature: ts, updatedAt: new Date() } : song
      );
      saveSongs(updatedSongs);
      return updatedSongs;
    });
  }

  function handleSongBpmChange(songId: string, newBpm: number) {
    setSongs(prevSongs => {
      const updatedSongs = prevSongs.map(song =>
        song.id === songId ? { ...song, bpm: newBpm } : song
      );
      saveSongs(updatedSongs);
      return updatedSongs;
    });
    if (songId === currentSongId) setCurrentBpm(newBpm);
  }

  function handleSelectSong(song: Song) {
    const updatedSong = { ...song, lastOpened: new Date() };
    const updatedSongs = songs.map(s => s.id === song.id ? updatedSong : s);
    setSongs(updatedSongs);
    saveSongs(updatedSongs);
    setCurrentSongId(song.id);
    saveCurrentSong(song.id);
    setCurrentTuning(song.tuning || DEFAULT_TUNING);
    setCapoSettings(song.capoSettings || { fret: 0, enabled: false });
    setCurrentBpm(song.bpm || 120);
    setCurrentTimeSignature(song.timeSignature || { beatsPerMeasure: 4, beatUnit: 4 });
  }

  function handleCreateSong(name: string) {
    const now = new Date();
    const newSong: Song = {
      id: generateSongId(),
      name,
      bpm: 120,
      progressions: [{
        id: generateProgressionId(),
        name: 'Progression 1',
        chords: [],
        bpm: 120,
        createdAt: now,
        updatedAt: now
      }],
      tuning: DEFAULT_TUNING,
      capoSettings: { fret: 0, enabled: false },
      createdAt: now,
      updatedAt: now
    };
    setSongs(prevSongs => {
      const updatedSongs = [...prevSongs, newSong];
      saveSongs(updatedSongs);
      return updatedSongs;
    });
    setCurrentSongId(newSong.id);
    saveCurrentSong(newSong.id);
    setCurrentTuning(DEFAULT_TUNING);
    setCapoSettings({ fret: 0, enabled: false });
    setCurrentBpm(newSong.bpm);
  }

  function handleRenameSong(songId: string, newName: string) {
    setSongs(prevSongs => {
      const updatedSongs = prevSongs.map(song =>
        song.id === songId ? { ...song, name: newName, updatedAt: new Date() } : song
      );
      saveSongs(updatedSongs);
      return updatedSongs;
    });
  }

  function handleDeleteSong(songId: string) {
    setSongs(prevSongs => {
      const updatedSongs = prevSongs.filter(song => song.id !== songId);
      saveSongs(updatedSongs);
      return updatedSongs;
    });
    if (currentSongId === songId) {
      setCurrentSongId(null);
      saveCurrentSong('');
    }
  }

  function handleBackToOverview() {
    setCurrentSongId(null);
    saveCurrentSong('');
  }

  function handleUpdateProgressionBpm(progressionId: string, bpm: number) {
    if (!currentSongId) return;
    setSongs(prevSongs => {
      const updatedSongs = prevSongs.map(song =>
        song.id === currentSongId ? updateProgressionBpm(song, progressionId, bpm) : song
      );
      saveSongs(updatedSongs);
      return updatedSongs;
    });
    setCurrentBpm(bpm);
  }

  function handleReorderProgressions(oldIndex: number, newIndex: number) {
    if (!currentSongId) return;
    setSongs(prevSongs => {
      const updatedSongs = prevSongs.map(song => {
        if (song.id === currentSongId) {
          const p = [...song.progressions];
          const [item] = p.splice(oldIndex, 1);
          p.splice(newIndex, 0, item);
          return { ...song, progressions: p, updatedAt: new Date() };
        }
        return song;
      });
      saveSongs(updatedSongs);
      return updatedSongs;
    });
  }

  function handleEditProgression(progressionId: string, field: 'name', value: string) {
    if (!currentSongId || field !== 'name') return;
    setSongs(prevSongs => {
      const updatedSongs = prevSongs.map(song => {
        if (song.id === currentSongId) {
          const updatedProgressions = song.progressions.map(p =>
            p.id === progressionId ? { ...p, name: value, updatedAt: new Date() } : p
          );
          return { ...song, progressions: updatedProgressions, updatedAt: new Date() };
        }
        return song;
      });
      saveSongs(updatedSongs);
      return updatedSongs;
    });
  }

  function handleDeleteProgression(progressionId: string) {
    if (!currentSongId) return;
    setSongs(prevSongs => {
      const updatedSongs = prevSongs.map(song => {
        if (song.id === currentSongId) {
          const updatedPairings = (song.pairings || [])
            .map(p => ({
              ...p,
              progressionIds: p.progressionIds.filter(id => id !== progressionId)
            }))
            .filter(p => p.progressionIds.length >= 2);
          return {
            ...song,
            progressions: song.progressions.filter(p => p.id !== progressionId),
            pairings: updatedPairings,
            updatedAt: new Date()
          };
        }
        return song;
      });
      saveSongs(updatedSongs);
      return updatedSongs;
    });
  }

  function handleAddProgression(songId: string) {
    const now = new Date();
    const newProgression = {
      id: generateProgressionId(),
      name: `Progression ${Date.now()}`,
      chords: [],
      bpm: songs.find(s => s.id === songId)?.bpm || 120,
      createdAt: now,
      updatedAt: now
    };
    setSongs(prevSongs => {
      const updatedSongs = prevSongs.map(song => {
        if (song.id === songId) {
          return { ...song, progressions: [...song.progressions, newProgression], updatedAt: now };
        }
        return song;
      });
      saveSongs(updatedSongs);
      return updatedSongs;
    });
  }

  function handleChordReorder(progressionId: string, oldIndex: number, newIndex: number) {
    if (!currentSongId) return;
    setSongs(prevSongs => {
      const updatedSongs = prevSongs.map(song => {
        if (song.id === currentSongId) {
          const updatedProgressions = song.progressions.map(p => {
            if (p.id === progressionId) {
              const c = [...p.chords];
              const [item] = c.splice(oldIndex, 1);
              c.splice(newIndex, 0, item);
              return { ...p, chords: c, updatedAt: new Date() };
            }
            return p;
          });
          return { ...song, progressions: updatedProgressions, updatedAt: new Date() };
        }
        return song;
      });
      saveSongs(updatedSongs);
      return updatedSongs;
    });
  }

  function handleChordReplace(progressionId: string, chordIndex: number) {
    console.log('Replace chord at index', chordIndex, 'in progression', progressionId);
  }

  function handleChordRemove(progressionId: string, chordIndex: number) {
    if (!currentSongId) return;
    setSongs(prevSongs => {
      const updatedSongs = prevSongs.map(song => {
        if (song.id === currentSongId) {
          const updatedProgressions = song.progressions.map(p => {
            if (p.id === progressionId) {
              return { ...p, chords: p.chords.filter((_, i) => i !== chordIndex), updatedAt: new Date() };
            }
            return p;
          });
          return { ...song, progressions: updatedProgressions, updatedAt: new Date() };
        }
        return song;
      });
      saveSongs(updatedSongs);
      return updatedSongs;
    });
  }

  function handleUpdateChordVoicing(progressionId: string, chordIndex: number, voicing: ChordVoicing | undefined) {
    if (!currentSongId) return;
    setSongs(prevSongs => {
      const updatedSongs = prevSongs.map(song => {
        if (song.id === currentSongId) {
          const updatedProgressions = song.progressions.map(p => {
            if (p.id === progressionId) {
              const updatedChords = p.chords.map((c, i) =>
                i === chordIndex ? { ...c, voicing } : c
              );
              return { ...p, chords: updatedChords, updatedAt: new Date() };
            }
            return p;
          });
          return { ...song, progressions: updatedProgressions, updatedAt: new Date() };
        }
        return song;
      });
      saveSongs(updatedSongs);
      return updatedSongs;
    });
  }

  async function handleAddChord(progressionId: string, chordName: string) {
    if (!currentSongId) return;
    const notes = getNotesForChord(chordName);
    // Check for saved voicings matching these notes + current tuning (use most recent)
    const saved = await findVoicingsForNotes(notes, currentTuning.id);
    const latest = saved.length > 0
      ? saved.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]
      : null;
    const voicing: ChordVoicing | undefined = latest
      ? { frets: latest.frets, tuningId: latest.tuningId }
      : undefined;
    const newChord = { name: chordName, notes, voicing };
    setSongs(prevSongs => {
      const updatedSongs = prevSongs.map(song => {
        if (song.id === currentSongId) {
          const updatedProgressions = song.progressions.map(p => {
            if (p.id === progressionId) {
              return { ...p, chords: [...p.chords, newChord], updatedAt: new Date() };
            }
            return p;
          });
          return { ...song, progressions: updatedProgressions, updatedAt: new Date() };
        }
        return song;
      });
      saveSongs(updatedSongs);
      return updatedSongs;
    });
  }

  // ─── Chord Beats ───

  function handleUpdateChordBeats(progressionId: string, chordIndex: number, beats: number) {
    if (!currentSongId) return;
    setSongs(prevSongs => {
      const updatedSongs = prevSongs.map(song => {
        if (song.id === currentSongId) {
          const updatedProgressions = song.progressions.map(p => {
            if (p.id === progressionId) {
              const updatedChords = p.chords.map((c, i) =>
                i === chordIndex ? { ...c, beats } : c
              );
              return { ...p, chords: updatedChords, updatedAt: new Date() };
            }
            return p;
          });
          return { ...song, progressions: updatedProgressions, updatedAt: new Date() };
        }
        return song;
      });
      saveSongs(updatedSongs);
      return updatedSongs;
    });
  }

  // ─── Pairing CRUD ───

  function handleCreatePairing(name: string, progressionIds: string[]): string | null {
    if (!currentSongId || progressionIds.length < 2) return null;
    const now = new Date();
    const newPairing: ChordPairing = {
      id: generatePairingId(),
      name,
      progressionIds,
      createdAt: now,
      updatedAt: now
    };
    setSongs(prevSongs => {
      const updatedSongs = prevSongs.map(song => {
        if (song.id === currentSongId) {
          return { ...song, pairings: [...(song.pairings || []), newPairing], updatedAt: now };
        }
        return song;
      });
      saveSongs(updatedSongs);
      return updatedSongs;
    });
    return newPairing.id;
  }

  function handleDeletePairing(pairingId: string) {
    if (!currentSongId) return;
    setSongs(prevSongs => {
      const updatedSongs = prevSongs.map(song => {
        if (song.id === currentSongId) {
          return { ...song, pairings: (song.pairings || []).filter(p => p.id !== pairingId), updatedAt: new Date() };
        }
        return song;
      });
      saveSongs(updatedSongs);
      return updatedSongs;
    });
  }

  function handleRenamePairing(pairingId: string, name: string) {
    if (!currentSongId) return;
    setSongs(prevSongs => {
      const updatedSongs = prevSongs.map(song => {
        if (song.id === currentSongId) {
          return {
            ...song,
            pairings: (song.pairings || []).map(p =>
              p.id === pairingId ? { ...p, name, updatedAt: new Date() } : p
            ),
            updatedAt: new Date()
          };
        }
        return song;
      });
      saveSongs(updatedSongs);
      return updatedSongs;
    });
  }

  function handleReorderPairingProgressions(pairingId: string, oldIndex: number, newIndex: number) {
    if (!currentSongId) return;
    setSongs(prevSongs => {
      const updatedSongs = prevSongs.map(song => {
        if (song.id === currentSongId) {
          return {
            ...song,
            pairings: (song.pairings || []).map(p => {
              if (p.id === pairingId) {
                const ids = [...p.progressionIds];
                const [item] = ids.splice(oldIndex, 1);
                ids.splice(newIndex, 0, item);
                return { ...p, progressionIds: ids, updatedAt: new Date() };
              }
              return p;
            }),
            updatedAt: new Date()
          };
        }
        return song;
      });
      saveSongs(updatedSongs);
      return updatedSongs;
    });
  }

  const currentSong = currentSongId ? songs.find(s => s.id === currentSongId) ?? null : null;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text)' }}>

      {/* ─── Sticky Header ─── */}
      <div className="sticky-header">
        {/* Brand row */}
        <header className="sticky-header__brand">
          <div className="app-container flex items-center justify-between py-3">
            <h1
              className="text-xl font-bold cursor-pointer transition-colors"
              style={{ fontFamily: 'var(--font-body)', color: 'var(--text)', letterSpacing: '-0.02em' }}
              onClick={handleBackToOverview}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text)')}
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
                onTempoChange={(bpm) => {
                  setCurrentBpm(bpm);
                  if (currentSongId) handleSongBpmChange(currentSongId, bpm);
                }}
                currentBpm={currentBpm}
                disabled={!currentSongId}
                timeSignature={currentTimeSignature}
              />
              <TimeSignatureSelector
                timeSignature={currentTimeSignature}
                onChange={handleTimeSignatureChange}
                disabled={!currentSongId}
              />
              <TuningSelector
                currentTuning={currentTuning}
                onTuningChange={handleTuningChange}
                capoSettings={capoSettings}
                onCapoChange={handleCapoChange}
              />
            </div>
          </div>
        </div>

        {/* Song info row (only when a song is open) */}
        {currentSong && (
          <div className="sticky-header__song-info">
            <div className="app-container">
              <SongManager
                songs={songs}
                currentSong={currentSong}
                onSelectSong={handleSelectSong}
                onCreateSong={handleCreateSong}
                onRenameSong={handleRenameSong}

                onDeleteSong={handleDeleteSong}
                onBackToOverview={handleBackToOverview}
              />
            </div>
          </div>
        )}
      </div>

      {/* ─── Main Content ─── */}
      <main className="app-container py-8 space-y-8">
        {/* Song Manager (overview only — when no song is open) */}
        {!currentSong && (
          <section>
            <SongManager
              songs={songs}
              currentSong={null}
              onSelectSong={handleSelectSong}
              onCreateSong={handleCreateSong}
              onRenameSong={handleRenameSong}

              onDeleteSong={handleDeleteSong}
              onBackToOverview={handleBackToOverview}
            />
          </section>
        )}

        {/* Song Scale Analysis */}
        {currentSong && (
          <section>
            <SongScale song={currentSong} />
          </section>
        )}

        {/* Song Progressions */}
        {currentSong && (
          <section>
            <SongProgressions
              progressions={currentSong.progressions || []}
              pairings={currentSong.pairings || []}
              timeSignature={currentTimeSignature}
              onReorderProgressions={handleReorderProgressions}
              onEditProgression={handleEditProgression}
              onUpdateProgressionBpm={handleUpdateProgressionBpm}
              onDeleteProgression={handleDeleteProgression}
              onChordReorder={handleChordReorder}
              onChordReplace={handleChordReplace}
              onChordRemove={handleChordRemove}
              onUpdateChordVoicing={handleUpdateChordVoicing}
              onAddChord={handleAddChord}
              onUpdateChordBeats={handleUpdateChordBeats}
              onAddProgression={() => handleAddProgression(currentSongId!)}
              onCreatePairing={handleCreatePairing}
              onDeletePairing={handleDeletePairing}
              onRenamePairing={handleRenamePairing}
              onReorderPairingProgressions={handleReorderPairingProgressions}
              tuning={currentTuning}
              capoSettings={capoSettings}
              bpm={currentBpm}
            />
          </section>
        )}

        {/* Backup */}
        <section className="max-w-xl mx-auto pt-8">
          <BackupManager onDataRestored={() => window.location.reload()} />
        </section>
      </main>
    </div>
  )
}

export default App
