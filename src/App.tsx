import { useState, useEffect, useCallback } from 'react'
import { getNotesForChord } from './lib/chordUtils';
import type { Chord as ChordType } from './types/chord';
import type { Progression } from './types/progression';
import type { Song } from './types/song';
import { DEFAULT_TUNING, type Tuning, type CapoSettings } from './lib/tunings';
import { 
  saveProgressions, 
  loadProgressions, 
  saveCurrentProgression, 
  loadCurrentProgression,
  generateProgressionId 
} from './lib/progressionStorage';
import { 
  saveSongs, 
  loadSongs, 
  saveCurrentSong, 
  loadCurrentSong,
  generateSongId,
  updateProgressionBpm
} from './lib/songStorage';

import DebugStorage from './components/DebugStorage';
import BackupManager from './components/BackupManager';
import SongScale from './components/SongScale';
import VolumeSlider from './components/VolumeSlider';
import TuningSelector from './components/TuningSelector';
import { CapoSelector } from './components/CapoSelector';
import { IntegratedMetronome } from './components/IntegratedMetronome';
import SongManager from './components/SongManager';
import SongProgressions from './components/SongProgressions';

function App() {
  // Progression state (existing)
  const [progression, setProgression] = useState<ChordType[]>([]);
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
    // Update song's lastOpened timestamp
    const updatedSong = {
      ...song,
      lastOpened: new Date()
    };
    
    // Update the song in the songs list
    const updatedSongs = songs.map(s => s.id === song.id ? updatedSong : s);
    setSongs(updatedSongs);
    saveSongs(updatedSongs);
    
    setCurrentSongId(song.id);
    saveCurrentSong(song.id);
    
    // Update BPM based on the selected song
    setCurrentBpm(song.bpm || 120);
  }

  function handleCreateSong(name: string) {
    const now = new Date();
    const defaultProgression = {
      id: generateProgressionId(),
      name: 'Progression 1',
      chords: [],
      bpm: 120,
      createdAt: now,
      updatedAt: now
    };
    
    const newSong: Song = {
      id: generateSongId(),
      name,
      bpm: 120,
      progressions: [defaultProgression],
      tuning: currentTuning,
      capoSettings,
      createdAt: now,
      updatedAt: now
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
    
    // Update metronome BPM
    setCurrentBpm(bpm);
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

  function handleAddProgression(songId: string) {
    const now = new Date();
    const newProgression = {
      id: generateProgressionId(),
      name: `Progression ${Date.now()}`, // Unique name based on timestamp
      chords: [],
      bpm: songs.find(s => s.id === songId)?.bpm || 120,
      createdAt: now,
      updatedAt: now
    };
    
    setSongs(prevSongs => {
      const updatedSongs = prevSongs.map(song => {
        if (song.id === songId) {
          const updatedProgressions = [...song.progressions, newProgression];
          return { ...song, progressions: updatedProgressions, updatedAt: now };
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
      <h1 
        className="text-3xl font-bold text-center mb-8 text-gray-800 cursor-pointer hover:text-blue-600 transition-colors duration-200"
        onClick={handleBackToOverview}
      >
        Chordbook
      </h1>
      
      {/* Integrated Metronome and Auto Scroll Controls */}
      <div className="mb-6">
        <IntegratedMetronome 
          onTempoChange={setCurrentBpm} 
          currentBpm={currentBpm}
        />
      </div>
      
      {/* Tuning and Capo Controls */}
      <div className="flex gap-6 mb-6">
        <div>
          <TuningSelector 
            currentTuning={currentTuning}
            onTuningChange={setCurrentTuning}
          />
        </div>
        
        <div>
          <CapoSelector
            capoSettings={capoSettings}
            onCapoChange={setCapoSettings}
          />
        </div>
      </div>

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
        />
      </div>

      {/* Song Scale Analysis */}
      {currentSongId && (() => {
        const currentSong = songs.find(song => song.id === currentSongId);
        return currentSong ? (
          <div className="mb-8">
            <SongScale song={currentSong} />
          </div>
        ) : null;
      })()}

      {/* Song Progressions */}
      {currentSongId && (() => {
        const currentSong = songs.find(song => song.id === currentSongId);
        return currentSong ? (
          <div className="mb-8">
            <SongProgressions 
              progressions={currentSong.progressions || []}
              onReorderProgressions={handleReorderProgressions}
              onEditProgression={handleEditProgression}
              onUpdateProgressionBpm={handleUpdateProgressionBpm}
              onDeleteProgression={handleDeleteProgression}
              onChordReorder={handleChordReorder}
              onChordReplace={handleChordReplace}
              onChordRemove={handleChordRemove}
              onAddChord={handleAddChord}
              onAddProgression={() => handleAddProgression(currentSongId)}
              tuning={currentTuning}
              capoSettings={capoSettings}
              bpm={currentBpm}
            />
          </div>
        ) : null;
      })()}

      {/* Data Management - Bottom Section */}
      <div className="mt-16 w-1/2 mx-auto">
        <BackupManager onDataRestored={() => window.location.reload()} />
      </div>
      
      <DebugStorage />
    </div>
  )
}

export default App
