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
  saveCurrentSong, 
  loadCurrentSong,
  generateSongId,
  updateProgressionBpm,
  generateProgressionId,
  scheduleAutoSave,
  forceSave,
  loadSongsWithRecovery,
  cleanupOldSongFiles,
  getSongsByLastOpened,
  getRecentlyOpenedSongs
} from './lib/songStorage';
import { deleteSongFile } from './lib/fileStorage';

import ProgressionList from './components/ProgressionList';
import DebugStorage from './components/DebugStorage';
import BackupManager from './components/BackupManager';
import SortableChordGrid from './components/SortableChordGrid';
import VolumeSlider from './components/VolumeSlider';
import SongManager from './components/SongManager';
import SongProgressions from './components/SongProgressions';
import HomePage from './components/HomePage';
import ErrorBoundary from './components/ErrorBoundary';
import ComponentErrorBoundary from './components/ComponentErrorBoundary';
import ErrorRecoveryPanel from './components/ErrorRecoveryPanel';
import ErrorTestComponent from './components/ErrorTestComponent';
import StorageTest from './components/StorageTest';
import { errorMonitor } from './services/ErrorMonitoring';
import { capoRateLimiter } from './lib/capoRateLimit';
import CapoErrorBoundary from './components/CapoErrorBoundary';
import AutoSaveStatus from './components/AutoSaveStatus';

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
    console.log('🔧 Loading songs on app start...');
    const loadedSongs = loadSongsWithRecovery();
    console.log('🔧 Loaded songs with recovery:', loadedSongs);
    setSongs(loadedSongs);
    
    const currentId = loadCurrentSong();
    console.log('🔧 Current song ID:', currentId);
    if (currentId) {
      setCurrentSongId(currentId);
    }
    
    // Cleanup old song files periodically
    if (loadedSongs.length > 0) {
      cleanupOldSongFiles(loadedSongs);
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

  // Auto-save songs whenever they change
  useEffect(() => {
    console.log('🔧 Auto-save effect triggered, songs.length:', songs.length);
    if (songs.length > 0) {
      console.log('🔧 Scheduling auto-save for songs:', songs.map(s => s.name));
      scheduleAutoSave(songs);
    }
  }, [songs]);

  // Save immediately on page unload or visibility change
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (songs.length > 0) {
        forceSave(songs);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && songs.length > 0) {
        forceSave(songs);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [songs]);

  // Periodic cleanup of old song files
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      if (songs.length > 0) {
        cleanupOldSongFiles(songs);
      }
    }, 60000); // Every minute

    return () => clearInterval(cleanupInterval);
  }, [songs]);

  // BPM handlers for songs and progressions
  function handleSongBpmChange(songId: string, newBpm: number) {
    setSongs(prevSongs => {
      const updatedSongs = prevSongs.map(song => 
        song.id === songId ? { ...song, bpm: newBpm, updatedAt: new Date() } : song
      );
      // Force immediate save for BPM changes
      forceSave(updatedSongs);
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
    
    // Update BPM, tuning, and capo based on the selected song
    setCurrentBpm(song.bpm || 120);
    setCurrentTuning(song.tuning || DEFAULT_TUNING);
    setCapoSettings(song.capoSettings || { fret: 0, enabled: false });
  }

  function handleTuningChange(newTuning: Tuning) {
    setCurrentTuning(newTuning);
    
    // Update the current song's tuning
    if (currentSongId) {
      setSongs(prevSongs => {
        const updatedSongs = prevSongs.map(song => 
          song.id === currentSongId 
            ? { ...song, tuning: newTuning, updatedAt: new Date() }
            : song
        );
        // Force immediate save for tuning changes
        forceSave(updatedSongs);
        return updatedSongs;
      });
    }
  }

  function handleCapoChange(newCapoSettings: CapoSettings) {
    console.log('🎸 Capo change requested:', newCapoSettings);
    
    // Update UI state immediately for responsiveness
    setCapoSettings(newCapoSettings);
    
    // Update the current song's capo settings with rate limiting
    if (currentSongId) {
      const saveOperation = () => {
        setSongs(prevSongs => {
          const updatedSongs = prevSongs.map(song => 
            song.id === currentSongId 
              ? { ...song, capoSettings: newCapoSettings, updatedAt: new Date() }
              : song
          );
          console.log('🎸 Saving capo changes to storage...');
          forceSave(updatedSongs);
          return updatedSongs;
        });
      };

      // Use rate limiter to prevent overwhelming the file system
      capoRateLimiter.debouncedSave(saveOperation);
    }
  }

  function handleCreateSong(name: string) {
    console.log('🔧 Creating new song:', name);
    const newSong: Song = {
      id: generateSongId(),
      name,
      bpm: 120,
      progressions: [],
      tuning: currentTuning,
      capoSettings: capoSettings,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log('🔧 New song object:', newSong);
    
    setSongs(prevSongs => {
      const updatedSongs = [...prevSongs, newSong];
      console.log('🔧 Updated songs array:', updatedSongs);
      // Force immediate save for song creation
      forceSave(updatedSongs);
      return updatedSongs;
    });
    
    // Select the new song
    setCurrentSongId(newSong.id);
    saveCurrentSong(newSong.id);
    setCurrentBpm(newSong.bpm);
    // No need to set tuning/capo as they're already current
  }

  function handleRenameSong(songId: string, newName: string) {
    setSongs(prevSongs => {
      const updatedSongs = prevSongs.map(song => 
        song.id === songId 
          ? { ...song, name: newName, updatedAt: new Date() }
          : song
      );
      // Force immediate save for song rename
      forceSave(updatedSongs);
      return updatedSongs;
    });
  }

  function handleDeleteSong(songId: string) {
    // Find the song to delete for file cleanup
    const songToDelete = songs.find(song => song.id === songId);
    
    setSongs(prevSongs => {
      const updatedSongs = prevSongs.filter(song => song.id !== songId);
      // Force immediate save for song deletion
      forceSave(updatedSongs);
      return updatedSongs;
    });
    
    // Delete the individual song file (async, don't block)
    if (songToDelete) {
      deleteSongFile(songToDelete).catch(error => {
        console.warn(`Failed to delete file for song "${songToDelete.name}":`, error);
      });
    }
    
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
      // Progression changes are auto-saved
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
      // Auto-saved via useEffect
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
      // Auto-saved via useEffect
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
      // Auto-saved via useEffect
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
      // Auto-saved via useEffect
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
      // Auto-saved via useEffect
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
      // Auto-saved via useEffect
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
      // Auto-saved via useEffect
      return updatedSongs;
    });
  }

  function handleDataRestored() {
    // Reload songs after data is restored from backup
    const loadedSongs = loadSongsWithRecovery();
    setSongs(loadedSongs);
    
    // Clear current selection to show homepage
    setCurrentSongId(null);
    saveCurrentSong('');
    
    // Reload progressions if needed
    const progressions = loadProgressions();
    setSavedProgressions(progressions);
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 text-gray-900 p-8">
        <VolumeSlider />
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
          <button 
            onClick={handleBackToOverview}
            className="hover:text-blue-600 transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 rounded px-2 py-1"
            title="Back to Home"
          >
            Chordbook
          </button>
        </h1>
        
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
            <ComponentErrorBoundary 
              componentName="SortableChordGrid" 
              fallbackHeight="300px"
              onError={(error, componentName) => errorMonitor.logComponentError(componentName, error)}
            >
              <SortableChordGrid
                progression={progression}
                tuning={currentTuning}
                capoSettings={capoSettings}
                onReorder={reorderChords}
                onReplace={replaceChord}
                onRemove={removeChord}
              />
            </ComponentErrorBoundary>
          </div>
        )}
        
        {progression.length > 0 && (
          <ComponentErrorBoundary 
            componentName="ProgressionList" 
            fallbackHeight="200px"
            onError={(error, componentName) => errorMonitor.logComponentError(componentName, error)}
          >
            <ProgressionList 
              progression={progression} 
              onRemove={removeChord} 
              onReplace={replaceChord}
              onReorder={reorderChords}
            />
          </ComponentErrorBoundary>
        )}

        {/* Home Page or Song View */}
        {!currentSongId ? (
          /* Home Page - Show when no song is selected */
          <ComponentErrorBoundary 
            componentName="HomePage" 
            fallbackHeight="400px"
            onError={(error, componentName) => errorMonitor.logComponentError(componentName, error)}
          >
            <HomePage
              recentSongs={getRecentlyOpenedSongs(songs, 4)}
              allSongs={getSongsByLastOpened(songs)}
              onSelectSong={handleSelectSong}
              onCreateSong={handleCreateSong}
            />
          </ComponentErrorBoundary>
        ) : (
          /* Song View - Show when a song is selected */
          <div>
            {/* Song Manager */}
            <div className="mb-8">
              <CapoErrorBoundary
                onError={(error) => {
                  console.error('🚨 Capo error in SongManager:', error);
                  errorMonitor.logComponentError('SongManager-Capo', error);
                }}
                onRetry={() => {
                  console.log('🔄 Retrying capo operation...');
                  // Force a re-render by updating a dummy state
                  setCapoSettings(prev => ({ ...prev }));
                }}
                onBypass={() => {
                  console.log('⚠️ Bypassing capo save operations');
                  capoRateLimiter.clear();
                }}
              >
                <ComponentErrorBoundary 
                  componentName="SongManager" 
                  fallbackHeight="200px"
                  onError={(error, componentName) => errorMonitor.logComponentError(componentName, error)}
                >
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
                    onTuningChange={handleTuningChange}
                    onCapoChange={handleCapoChange}
                  />
                </ComponentErrorBoundary>
              </CapoErrorBoundary>
            </div>

            {/* Song Progressions */}
            <div className="mb-8">
              <ComponentErrorBoundary 
                componentName="SongProgressions" 
                fallbackHeight="300px"
                onError={(error, componentName) => errorMonitor.logComponentError(componentName, error)}
              >
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
              </ComponentErrorBoundary>
            </div>
          </div>
        )}
        
        <ComponentErrorBoundary 
          componentName="BackupManager" 
          fallbackHeight="100px"
          onError={(error, componentName) => errorMonitor.logComponentError(componentName, error)}
        >
          <BackupManager onDataRestored={handleDataRestored} />
        </ComponentErrorBoundary>
        <ComponentErrorBoundary 
          componentName="DebugStorage" 
          fallbackHeight="50px"
          onError={(error, componentName) => errorMonitor.logComponentError(componentName, error)}
        >
          <DebugStorage />
        </ComponentErrorBoundary>
        
        {/* Error Recovery Panel */}
        <ErrorRecoveryPanel />
        
        {/* Error Test Component (Development Only) */}
        <ErrorTestComponent />
        
        {/* Storage Test Component (Development Only) */}
        <StorageTest />
        
        {/* Auto-save Status */}
        <AutoSaveStatus />
      </div>
    </ErrorBoundary>
  )
}

export default App
