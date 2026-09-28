import { useState, useEffect, useMemo } from 'react'
import { getNotesForChord, findChordByNotes } from './lib/music/chords';
import { getNotesFromVoicing, pitchClassKey } from './lib/music/notes';
import type { Song, SongLink, TimeSignature, ChordPairing } from './types/song';
import type { ChordVoicing } from './types/chord';
import type { Lead } from './types/lead';
import type { LeadNote } from './types/lead';
import type { ImportedProgression, ImportedLead } from './components/GPImportModal';
import { DEFAULT_TUNING, getSoundingTuning, type Tuning, type CapoSettings } from './lib/music/tunings';
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
import { findVoicingsForNotes, saveVoicing, getSavedVoicings, hasVoicing } from './lib/savedVoicingLibrary';
import type { SavedVoicing } from './types/chord';
import { getAllLeads, saveLead as saveLeadToDb, deleteLead as deleteLeadFromDb } from './lib/leadStorage';
import { db } from './lib/db';

import { analyzeProgression, type ProgressionAnalysis } from './lib/harmonicAnalysis';
import BackupManager from './components/BackupManager';

import { IntegratedMetronome } from './components/IntegratedMetronome';
import SongManager from './components/SongManager';
import SongProgressions from './components/SongProgressions';
import ThemePicker from './components/ThemePicker';
import { TimeSignatureSelector } from './components/TimeSignatureSelector';
import { InstrumentSelector } from './components/InstrumentSelector';
import SongFretboard from './components/SongFretboard';
import { FretboardFocusContext, type FretboardFocus } from './lib/fretboardFocus';
import { getUniqueNotesFromSong } from './lib/songAnalysis';

/**
 * Backfill voicings: for any chord without a voicing, apply the latest
 * saved voicing that matches by chord name or by notes.
 */
async function backfillVoicings(songs: Song[]): Promise<Song[]> {
  const allVoicings = await getSavedVoicings();
  if (allVoicings.length === 0) return songs;

  // Build lookup: chord name → latest saved voicing
  // Voicing names are like "Dm7 1", "Dm7 2" — extract the chord name prefix
  const byChordName = new Map<string, SavedVoicing>();
  const sorted = [...allVoicings].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  for (const v of sorted) {
    // Extract chord name: strip trailing " <number>" suffix
    const chordName = v.name.replace(/\s+\d+$/, '');
    if (!byChordName.has(chordName)) {
      byChordName.set(chordName, v);
    }
  }

  let changed = false;
  const updatedSongs = songs.map(song => {
    const updatedProgressions = song.progressions.map(prog => {
      const updatedChords = prog.chords.map(chord => {
        if (chord.voicing) return chord; // already has a voicing

        // Try matching by chord name
        const match = byChordName.get(chord.name);
        if (match) {
          changed = true;
          return { ...chord, voicing: { frets: match.frets, tuningId: match.tuningId } };
        }

        // Try matching by notes
        const noteMatch = sorted.find(v =>
          v.notes.length > 0 &&
          chord.notes.length > 0 &&
          pitchClassKey(v.notes) === pitchClassKey(chord.notes)
        );
        if (noteMatch) {
          changed = true;
          return { ...chord, voicing: { frets: noteMatch.frets, tuningId: noteMatch.tuningId } };
        }

        return chord;
      });
      return { ...prog, chords: updatedChords };
    });
    return { ...song, progressions: updatedProgressions };
  });

  if (changed) {
    saveSongs(updatedSongs);
  }
  return updatedSongs;
}

function App() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentSongId, setCurrentSongId] = useState<string | null>(null);
  const [currentTuning, setCurrentTuning] = useState<Tuning>(DEFAULT_TUNING);
  const [capoSettings, setCapoSettings] = useState<CapoSettings>({ fret: 0, enabled: false });
  const [currentBpm, setCurrentBpm] = useState<number>(120);
  const [currentTheme, setCurrentTheme] = useState<Theme>(themes[0]);
  const [currentTimeSignature, setCurrentTimeSignature] = useState<TimeSignature>({ beatsPerMeasure: 4, beatUnit: 4 });
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);
  const [analysisEnabled, setAnalysisEnabled] = useState(false);
  // Chord shown on the song-header fretboard (published by the progression grids)
  const [fretFocus, setFretFocus] = useState<FretboardFocus | null>(null);
  const [fretboardCollapsed, setFretboardCollapsed] = useState(false);
  const fretboardFocusValue = useMemo(() => ({ focus: fretFocus, setFocus: setFretFocus }), [fretFocus]);

  useEffect(() => {
    async function init() {
      const theme = await loadTheme();
      applyTheme(theme);
      setCurrentTheme(theme);

      await migrateLocalStorageToDB();
      let loadedSongs = await loadSongsAsync();

      // Backfill voicings: apply saved voicings to chords that don't have one
      loadedSongs = await backfillVoicings(loadedSongs);

      setSongs(loadedSongs);

      const loadedLeads = await getAllLeads();
      setLeads(loadedLeads);

      // Restore active lead
      try {
        const activeLeadEntry = await db.appState.get('activeLeadId');
        if (activeLeadEntry) setActiveLeadId(activeLeadEntry.value || null);
      } catch {}

      try {
        const collapsedEntry = await db.appState.get('fretboardCollapsed');
        if (collapsedEntry) setFretboardCollapsed(collapsedEntry.value === 'true');
      } catch { /* keep default */ }

      // Restore analysis toggle
      try {
        const analysisEntry = await db.appState.get('analysisEnabled');
        if (analysisEntry) setAnalysisEnabled(analysisEntry.value === 'true');
      } catch {}

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

  function handleUpdateSongLinks(songId: string, links: SongLink[]) {
    setSongs(prevSongs => {
      const updatedSongs = prevSongs.map(song =>
        song.id === songId ? { ...song, links, updatedAt: new Date() } : song
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

  function handleChordRename(progressionId: string, chordIndex: number, name: string) {
    if (!currentSongId) return;
    // Keep the voicing; notes follow the new name (custom [C, E, G] names included)
    const notes = getNotesForChord(name);
    setSongs(prevSongs => {
      const updatedSongs = prevSongs.map(song => {
        if (song.id !== currentSongId) return song;
        const updatedProgressions = song.progressions.map(p => {
          if (p.id !== progressionId) return p;
          const chords = p.chords.map((c, i) =>
            i === chordIndex ? { ...c, name, notes: notes.length > 0 ? notes : c.notes } : c
          );
          return { ...p, chords, updatedAt: new Date() };
        });
        return { ...song, progressions: updatedProgressions, updatedAt: new Date() };
      });
      saveSongs(updatedSongs);
      return updatedSongs;
    });
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

  async function handleUpdateChordVoicing(
    progressionId: string,
    chordIndex: number,
    voicing: ChordVoicing | undefined,
    renameTo?: string,
  ) {
    if (!currentSongId) return;

    const song = songs.find(s => s.id === currentSongId);
    const targetChord = song?.progressions.find(p => p.id === progressionId)?.chords[chordIndex];
    if (!targetChord) return;

    // Voicing frets are capo-relative, so notes come from the sounding tuning
    const derivedNotes = voicing
      ? [...new Set(getNotesFromVoicing(getSoundingTuning(currentTuning, capoSettings), voicing.frets))]
      : [];

    // Name/notes for the edited chord: explicit rename from the editor, or derived
    // from the tab when the chord had no notes yet (added as an empty chord)
    let name = targetChord.name;
    let notes = targetChord.notes;
    if (voicing && (renameTo || notes.length === 0)) {
      name = renameTo || findChordByNotes(derivedNotes) || (derivedNotes.length > 0 ? `[${derivedNotes.join(', ')}]` : name);
      const named = getNotesForChord(name);
      notes = named.length > 0 ? named : derivedNotes;
    }

    // Keep the voicing bank in sync, without piling up duplicates on every apply
    if (voicing && name && !(await hasVoicing(voicing.frets, voicing.tuningId))) {
      const existing = await getSavedVoicings(voicing.tuningId);
      const sameChordCount = existing.filter(v => v.name.replace(/\s+\d+$/, '') === name).length;
      await saveVoicing({
        name: `${name} ${sameChordCount + 1}`,
        tuningId: voicing.tuningId,
        frets: voicing.frets,
        notes: notes.length > 0 ? notes : derivedNotes,
      });
    }

    setSongs(prevSongs => {
      const updatedSongs = prevSongs.map(s => {
        let songChanged = false;
        const updatedProgressions = s.progressions.map(p => {
          let progChanged = false;
          const updatedChords = p.chords.map((c, i) => {
            if (s.id === currentSongId && p.id === progressionId && i === chordIndex) {
              progChanged = true;
              return { ...c, name, notes, voicing };
            }
            // Fill same-name chords (in songs with this tuning) that have no voicing yet.
            // Chords the user already voiced are left alone so edits stay per-chord.
            if (voicing && !c.voicing && c.name === name && (s.tuning?.id ?? DEFAULT_TUNING.id) === voicing.tuningId) {
              progChanged = true;
              return { ...c, voicing };
            }
            return c;
          });
          if (!progChanged) return p;
          songChanged = true;
          return { ...p, chords: updatedChords, updatedAt: new Date() };
        });
        return songChanged ? { ...s, progressions: updatedProgressions, updatedAt: new Date() } : s;
      });
      saveSongs(updatedSongs);
      return updatedSongs;
    });
  }

  function handleAddChordWithVoicing(progressionId: string, name: string, notes: string[], voicing: ChordVoicing) {
    if (!currentSongId) return;
    const newChord = { name, notes, voicing };
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

  async function handleImportGP(importedProgressions: ImportedProgression[], importedLeads: ImportedLead[]) {
    if (!currentSongId) return;
    const now = new Date();

    // Create progressions with chords
    const newProgressions = importedProgressions.map(ip => ({
      id: generateProgressionId(),
      name: ip.name,
      chords: ip.chords.map(c => ({
        name: c.name,
        notes: c.notes,
        voicing: c.voicing,
      })),
      createdAt: now,
      updatedAt: now,
    }));

    if (newProgressions.length > 0) {
      setSongs(prevSongs => {
        const updated = prevSongs.map(song => {
          if (song.id === currentSongId) {
            return { ...song, progressions: [...song.progressions, ...newProgressions], updatedAt: now };
          }
          return song;
        });
        saveSongs(updated);
        return updated;
      });
    }

    // Create leads
    for (const il of importedLeads) {
      await handleCreateLead(il.name, il.notes, il.tuningId);
    }
  }

  async function handleAddChord(progressionId: string, chordName: string) {
    if (!currentSongId) return;
    const notes = getNotesForChord(chordName);
    // Check for saved voicings matching these notes + current tuning (use most recent)
    let saved = await findVoicingsForNotes(notes, currentTuning.id);
    // Fallback: match by chord name prefix if notes didn't match
    if (saved.length === 0) {
      const allForTuning = await getSavedVoicings(currentTuning.id);
      saved = allForTuning.filter(v => v.name.replace(/\s+\d+$/, '') === chordName);
    }
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

  // ─── Lead CRUD ───

  const activeLead = activeLeadId ? leads.find(l => l.id === activeLeadId) ?? null : null;
  const activeLeadNotes = useMemo(
    () => activeLead ? [...new Set(activeLead.notes.map(n => n.note))] : [],
    [activeLead]
  );

  function handleActivateLead(leadId: string | null) {
    setActiveLeadId(leadId);
    db.appState.put({ key: 'activeLeadId', value: leadId || '' });
  }

  async function handleCreateLead(name: string, notes: LeadNote[], tuningId: string) {
    const id = await saveLeadToDb({ name, notes, tuningId });
    const newLead: Lead = { id, name, notes, tuningId, createdAt: new Date(), updatedAt: new Date() };
    setLeads(prev => [...prev, newLead]);
    // Auto-associate with current song
    if (currentSongId) {
      setSongs(prevSongs => {
        const updatedSongs = prevSongs.map(song => {
          if (song.id === currentSongId) {
            return { ...song, leadIds: [...(song.leadIds || []), id], updatedAt: new Date() };
          }
          return song;
        });
        saveSongs(updatedSongs);
        return updatedSongs;
      });
    }
    handleActivateLead(id);
  }

  function handleDeleteLead(leadId: string) {
    deleteLeadFromDb(leadId);
    setLeads(prev => prev.filter(l => l.id !== leadId));
    if (activeLeadId === leadId) handleActivateLead(null);
    // Remove from all songs
    setSongs(prevSongs => {
      const updatedSongs = prevSongs.map(song => {
        if (song.leadIds?.includes(leadId)) {
          return { ...song, leadIds: song.leadIds.filter(id => id !== leadId), updatedAt: new Date() };
        }
        return song;
      });
      saveSongs(updatedSongs);
      return updatedSongs;
    });
  }

  function handleAssociateLeadWithSong(leadId: string) {
    if (!currentSongId) return;
    setSongs(prevSongs => {
      const updatedSongs = prevSongs.map(song => {
        if (song.id === currentSongId && !(song.leadIds || []).includes(leadId)) {
          return { ...song, leadIds: [...(song.leadIds || []), leadId], updatedAt: new Date() };
        }
        return song;
      });
      saveSongs(updatedSongs);
      return updatedSongs;
    });
  }

  function handleDissociateLeadFromSong(leadId: string) {
    if (!currentSongId) return;
    setSongs(prevSongs => {
      const updatedSongs = prevSongs.map(song => {
        if (song.id === currentSongId) {
          return { ...song, leadIds: (song.leadIds || []).filter(id => id !== leadId), updatedAt: new Date() };
        }
        return song;
      });
      saveSongs(updatedSongs);
      return updatedSongs;
    });
    if (activeLeadId === leadId) handleActivateLead(null);
  }

  const currentSong = currentSongId ? songs.find(s => s.id === currentSongId) ?? null : null;

  const progressionAnalysis = useMemo((): ProgressionAnalysis | null => {
    if (!analysisEnabled || !currentSong) return null;
    const allChords = currentSong.progressions.flatMap(p => p.chords);
    if (allChords.length === 0) return null;
    return analyzeProgression(allChords);
  }, [analysisEnabled, currentSong?.progressions]);

  function handleToggleFretboard() {
    const next = !fretboardCollapsed;
    setFretboardCollapsed(next);
    db.appState.put({ key: 'fretboardCollapsed', value: String(next) });
  }

  const songNotes = useMemo(
    () => (currentSong ? getUniqueNotesFromSong(currentSong) : []),
    [currentSong]
  );

  function handleToggleAnalysis() {
    const next = !analysisEnabled;
    setAnalysisEnabled(next);
    db.appState.put({ key: 'analysisEnabled', value: String(next) });
  }

  return (
    <FretboardFocusContext.Provider value={fretboardFocusValue}>
    <div className="app-shell" style={{ background: 'var(--bg)', color: 'var(--text)' }}>

      {/* ─── Sticky Header ─── */}
      <div className="sticky-header">
        {/* Brand row */}
        <header className="sticky-header__brand">
          <div className="app-container flex items-center justify-between py-5">
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
              <InstrumentSelector />
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
                currentTuning={currentTuning}
                onTuningChange={handleTuningChange}
                capoSettings={capoSettings}
                onCapoChange={handleCapoChange}
                onImportGP={handleImportGP}
                onLinksChange={handleUpdateSongLinks}
              />
              <SongFretboard
                focus={fretFocus}
                songNotes={songNotes}
                tuning={currentTuning}
                capoSettings={capoSettings}
                activeLeadNotes={activeLeadNotes}
                collapsed={fretboardCollapsed}
                onToggleCollapsed={handleToggleFretboard}
              />
            </div>
          </div>
        )}
      </div>

      {/* ─── Main Content ─── */}
      <main className="app-shell__content">
        <div className="app-container py-8 space-y-8">
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
              onChordRename={handleChordRename}
              onChordRemove={handleChordRemove}
              onUpdateChordVoicing={handleUpdateChordVoicing}
              onAddChord={handleAddChord}
              onAddChordWithVoicing={handleAddChordWithVoicing}
              onUpdateChordBeats={handleUpdateChordBeats}
              onAddProgression={() => handleAddProgression(currentSongId!)}
              onCreatePairing={handleCreatePairing}
              onDeletePairing={handleDeletePairing}
              onRenamePairing={handleRenamePairing}
              onReorderPairingProgressions={handleReorderPairingProgressions}
              tuning={currentTuning}
              capoSettings={capoSettings}
              bpm={currentBpm}
              songLeadIds={currentSong.leadIds || []}
              allLeads={leads}
              activeLeadId={activeLeadId}
              activeLeadNotes={activeLeadNotes}
              onActivateLead={handleActivateLead}
              onCreateLead={handleCreateLead}
              onDeleteLead={handleDeleteLead}
              onAssociateLeadWithSong={handleAssociateLeadWithSong}
              onDissociateLeadFromSong={handleDissociateLeadFromSong}
              songName={currentSong.name}
              analysisEnabled={analysisEnabled}
              progressionAnalysis={progressionAnalysis}
              onToggleAnalysis={handleToggleAnalysis}
            />
          </section>
        )}

        </div>
      </main>

      {/* ─── Footer ─── */}
      <footer className="app-shell__footer">
        <BackupManager onDataRestored={() => window.location.reload()} compact />
      </footer>
    </div>
    </FretboardFocusContext.Provider>
  )
}

export default App
