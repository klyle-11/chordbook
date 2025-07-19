import { useState, useEffect, useCallback } from 'react'
import { getNotesForChord } from './lib/chordUtils';
import type { Chord as ChordType } from './types/chord';
import type { Progression } from './types/progression';
import type { Song } from './types/song';
import type { NamedProgression } from './types/song';
import { DEFAULT_TUNING, type Tuning, type CapoSettings } from './lib/tunings';
import { 
  saveProgressions, 
  loadProgressions, 
  saveCurrentProgression, 
  loadCurrentProgression
} from './lib/progressionStorage';
import { 
  saveSongs, 
  loadSongs, 
  saveCurrentSong, 
  loadCurrentSong,
  generateSongId,
  updateProgressionBpm,
  generateProgressionId
} from './lib/songStorage';

import ProgressionList from './components/ProgressionList';
import SavedProgressions from './components/SavedProgressions';
import DebugStorage from './components/DebugStorage';
import SortableChordGrid from './components/SortableChordGrid';
import VolumeSlider from './components/VolumeSlider';
import SongManager from './components/SongManager';
import SongProgressions from './components/SongProgressions';

function App() {
  // Progression state (existing)
  const [progression, setProgression] = useState<ChordType[]>([]);
  const [replacingIndex, setReplacingIndex] = useState<number | null>(null);
  const [savedProgressions, setSavedProgressions] = useState<Progression[]>([]);
  const [currentProgressionId, setCurrentProgressionId] = useState<string | null>(null);
  const [currentProgressionName, setCurrentProgressionName] = useState<string>('Untitled');
  
  // Song state (new)
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentSongId, setCurrentSongId] = useState<string | null>(null);
  
  // Other state
  const [currentTuning, setCurrentTuning] = useState<Tuning>(DEFAULT_TUNING);
  const [capoSettings, setCapoSettings] = useState<CapoSettings>({ fret: 0, enabled: false });
  const [currentBpm, setCurrentBpm] = useState<number>(120);

  // Load saved progressions on app start
  useEffect(() => {
    const progressions = loadProgressions();
    console.log('Loaded progressions:', progressions);
    setSavedProgressions(progressions);
    
    const currentId = loadCurrentProgression();
    console.log('Current progression ID:', currentId);
    if (currentId) {
      const currentProgression = progressions.find(p => p.id === currentId);
      console.log('Found current progression:', currentProgression);
      if (currentProgression) {
        setCurrentProgressionId(currentId);
        setProgression(currentProgression.chords);
        setCurrentProgressionName(currentProgression.name);
      }
    }
  }, []);

  // Load saved songs on app start
  useEffect(() => {
    const loadedSongs = loadSongs();
    console.log('Loaded songs:', loadedSongs);
    setSongs(loadedSongs);
    
    const currentId = loadCurrentSong();
    console.log('Current song ID:', currentId);
    if (currentId) {
      setCurrentSongId(currentId);
    }
  }, []);

  const saveCurrentProgressionToStorage = useCallback(() => {
    const now = new Date();
    let progressionToSave: Progression;

    if (currentProgressionId) {
      // Update existing progression
      progressionToSave = {
        id: currentProgressionId,
        name: currentProgressionName,
        chords: progression,
        createdAt: savedProgressions.find(p => p.id === currentProgressionId)?.createdAt || now,
        updatedAt: now
      };
    } else {
      // Create new progression
      const newId = generateProgressionId();
      progressionToSave = {
        id: newId,
        name: currentProgressionName,
        chords: progression,
        createdAt: now,
        updatedAt: now
      };
      setCurrentProgressionId(newId);
    }

    const updatedProgressions = currentProgressionId
      ? savedProgressions.map(p => p.id === currentProgressionId ? progressionToSave : p)
      : [...savedProgressions, progressionToSave];

    setSavedProgressions(updatedProgressions);
    saveProgressions(updatedProgressions);
    saveCurrentProgression(progressionToSave.id);
  }, [currentProgressionId, currentProgressionName, progression, savedProgressions]);

  // Auto-save current progression whenever it changes
  useEffect(() => {
    const saveProgression = () => {
      if (progression.length > 0) {
        saveCurrentProgressionToStorage();
      }
    };
    
    saveProgression();
  }, [progression, currentProgressionId, currentProgressionName, saveCurrentProgressionToStorage]);

  function removeChord(index: number) {
    setProgression((prev) => prev.filter((_, i) => i !== index));
  }

  function replaceChord(index: number) {
    setReplacingIndex(index);
    // Scroll to the top where the chord input form is located
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function reorderChords(oldIndex: number, newIndex: number) {
    setProgression((prev) => {
      const newProgression = [...prev];
      const [reorderedItem] = newProgression.splice(oldIndex, 1);
      newProgression.splice(newIndex, 0, reorderedItem);
      return newProgression;
    });
  }

  function loadProgression(progressionId: string) {
    // Save current progression before switching if it has changes
    if (progression.length > 0 && currentProgressionId !== progressionId) {
      saveCurrentProgressionToStorage();
    }

    const targetProgression = savedProgressions.find(p => p.id === progressionId);
    if (targetProgression) {
      setCurrentProgressionId(progressionId);
      setProgression(targetProgression.chords);
      setCurrentProgressionName(targetProgression.name);
      setReplacingIndex(null);
      saveCurrentProgression(progressionId);
    }
  }

  function deleteProgression(progressionId: string) {
    const updatedProgressions = savedProgressions.filter(p => p.id !== progressionId);
    setSavedProgressions(updatedProgressions);
    saveProgressions(updatedProgressions);

    if (currentProgressionId === progressionId) {
      // If deleting current progression, start fresh
      newProgression();
    }
  }

  function newProgression() {
    // Save current progression before creating new one if it has changes
    if (progression.length > 0) {
      saveCurrentProgressionToStorage();
    }

    setCurrentProgressionId(null);
    setProgression([]);
    setCurrentProgressionName('Untitled');
    setReplacingIndex(null);
  }

  // BPM handlers for songs and progressions
  function handleSongBpmChange(songId: string, newBpm: number) {
    setSongs(prevSongs => {
      const updatedSongs = prevSongs.map(song => 
        song.id === songId ? { ...song, bpm: newBpm } : song
      );
      saveSongs(updatedSongs);
      return updatedSongs;
    });
    
    // Update metronome BPM if this is the current song
    if (songId === currentSongId) {
      setCurrentBpm(newBpm);
    }
  }

  function handleSelectSong(song: Song) {
    setCurrentSongId(song.id);
    saveCurrentSong(song.id);
    
    // Update BPM based on the selected song
    setCurrentBpm(song.bpm || 120);
  }

  function handleCreateSong(name: string) {
    const newSong: Song = {
      id: generateSongId(),
      name,
      bpm: 120,
      progressions: [],
      tuning: currentTuning,
      capoSettings,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    setSongs(prevSongs => {
      const updatedSongs = [...prevSongs, newSong];
      saveSongs(updatedSongs);
      return updatedSongs;
    });
    
    // Select the new song
    setCurrentSongId(newSong.id);
    saveCurrentSong(newSong.id);
    setCurrentBpm(newSong.bpm);
  }

  function handleRenameSong(songId: string, newName: string) {
    setSongs(prevSongs => {
      const updatedSongs = prevSongs.map(song => 
        song.id === songId 
          ? { ...song, name: newName, updatedAt: new Date() }
          : song
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
    
    // If deleting current song, clear selection
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
        song.id === currentSongId 
          ? updateProgressionBpm(song, progressionId, bpm)
          : song
      );
      saveSongs(updatedSongs);
      return updatedSongs;
    });
  }

  function handleReorderProgressions(oldIndex: number, newIndex: number) {
    if (!currentSongId) return;
    
    setSongs(prevSongs => {
      const updatedSongs = prevSongs.map(song => {
        if (song.id === currentSongId) {
          const updatedProgressions = [...song.progressions];
          const [reorderedItem] = updatedProgressions.splice(oldIndex, 1);
          updatedProgressions.splice(newIndex, 0, reorderedItem);
          return { ...song, progressions: updatedProgressions, updatedAt: new Date() };
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
            p.id === progressionId 
              ? { ...p, name: value, updatedAt: new Date() }
              : p
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
          const updatedProgressions = song.progressions.filter(p => p.id !== progressionId);
          return { ...song, progressions: updatedProgressions, updatedAt: new Date() };
        }
        return song;
      });
      saveSongs(updatedSongs);
      return updatedSongs;
    });
  }

  function handleCreateProgression() {
    if (!currentSongId) return;
    
    const currentSong = songs.find(song => song.id === currentSongId);
    if (!currentSong) return;
    
    const now = new Date();
    const newProgression: NamedProgression = {
      id: generateProgressionId(),
      name: 'New Progression',
      chords: [],
      bpm: currentSong.bpm, // Inherit the song's BPM
      createdAt: now,
      updatedAt: now
    };
    
    setSongs(prevSongs => {
      const updatedSongs = prevSongs.map(song => {
        if (song.id === currentSongId) {
          const updatedProgressions = [...song.progressions, newProgression];
          return { ...song, progressions: updatedProgressions, updatedAt: new Date() };
        }
        return song;
      });
      saveSongs(updatedSongs);
      return updatedSongs;
    });
  }

  function handleSelectProgression(progressionId: string) {
    // This could be used to load the progression into the editor
    // For now, we'll leave it empty but it's required by the interface
    console.log('Selected progression:', progressionId);
  }

  function handleChordReorder(progressionId: string, oldIndex: number, newIndex: number) {
    if (!currentSongId) return;
    
    setSongs(prevSongs => {
      const updatedSongs = prevSongs.map(song => {
        if (song.id === currentSongId) {
          const updatedProgressions = song.progressions.map(p => {
            if (p.id === progressionId) {
              const updatedChords = [...p.chords];
              const [reorderedItem] = updatedChords.splice(oldIndex, 1);
              updatedChords.splice(newIndex, 0, reorderedItem);
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

  function handleChordReplace(progressionId: string, chordIndex: number) {
    // This would trigger chord replacement mode
    console.log('Replace chord at index', chordIndex, 'in progression', progressionId);
  }

  function handleChordRemove(progressionId: string, chordIndex: number) {
    if (!currentSongId) return;
    
    setSongs(prevSongs => {
      const updatedSongs = prevSongs.map(song => {
        if (song.id === currentSongId) {
          const updatedProgressions = song.progressions.map(p => {
            if (p.id === progressionId) {
              const updatedChords = p.chords.filter((_, index) => index !== chordIndex);
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

  function handleAddChord(progressionId: string, chordName: string) {
    if (!currentSongId) return;
    
    const notes = getNotesForChord(chordName);
    const newChord = { name: chordName, notes };
    
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

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-8">
      <VolumeSlider />
      <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">Chordbook</h1>
      
      {replacingIndex !== null && (
        <div className="bg-blue-100 border border-blue-300 rounded p-3 mb-4">
          <p className="text-blue-800">
            Replacing chord #{replacingIndex + 1}: {progression[replacingIndex].name}
          </p>
          <button 
            onClick={() => setReplacingIndex(null)}
            className="mt-2 px-3 py-1 bg-gray-400 text-white rounded hover:bg-gray-500"
          >
            Cancel Replace
          </button>
        </div>
      )}
      
      {progression.length > 0 && (
        <div className="mt-6">
          <SortableChordGrid
            progression={progression}
            tuning={currentTuning}
            capoSettings={capoSettings}
            onReorder={reorderChords}
            onReplace={replaceChord}
            onRemove={removeChord}
          />
        </div>
      )}
      
      {progression.length > 0 && (
        <ProgressionList 
          progression={progression} 
          onRemove={removeChord} 
          onReplace={replaceChord}
          onReorder={reorderChords}
        />
      )}

      {/* Song Manager */}
      <div className="mb-8">
        <SongManager 
          songs={songs}
          currentSong={songs.find(song => song.id === currentSongId) || null}
          onSelectSong={handleSelectSong}
          onCreateSong={handleCreateSong}
          onRenameSong={handleRenameSong}
          onUpdateSongBpm={handleSongBpmChange}
          onDeleteSong={handleDeleteSong}
          onBackToOverview={handleBackToOverview}
          currentTuning={currentTuning}
          capoSettings={capoSettings}
          onTuningChange={setCurrentTuning}
          onCapoChange={setCapoSettings}
        />
      </div>

      {/* Song Progressions */}
      {currentSongId && (
        <div className="mb-8">
          <SongProgressions 
            progressions={songs.find(song => song.id === currentSongId)?.progressions || []}
            onReorderProgressions={handleReorderProgressions}
            onEditProgression={handleEditProgression}
            onUpdateProgressionBpm={handleUpdateProgressionBpm}
            onDeleteProgression={handleDeleteProgression}
            onCreateProgression={handleCreateProgression}
            onSelectProgression={handleSelectProgression}
            currentProgressionId={null}
            onChordReorder={handleChordReorder}
            onChordReplace={handleChordReplace}
            onChordRemove={handleChordRemove}
            onAddChord={handleAddChord}
            tuning={currentTuning}
            capoSettings={capoSettings}
            bpm={currentBpm}
          />
        </div>
      )}
      
      <SavedProgressions
        progressions={savedProgressions}
        currentProgressionId={currentProgressionId}
        onLoadProgression={loadProgression}
        onDeleteProgression={deleteProgression}
        onNewProgression={newProgression}
      />
      
      <DebugStorage />
    </div>
  )
}

export default App
