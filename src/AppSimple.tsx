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
import StorageTest from './components/StorageTest';

function AppSimple() {
  // Song state (new)
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentSongId, setCurrentSongId] = useState<string | null>(null);

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
  }, []);

  // Auto-save songs whenever they change
  useEffect(() => {
    console.log('🔧 Auto-save effect triggered, songs.length:', songs.length);
    if (songs.length > 0) {
      console.log('🔧 Scheduling auto-save for songs:', songs.map(s => s.name));
      scheduleAutoSave(songs);
    }
  }, [songs]);

  function handleCreateSong(name: string) {
    console.log('🔧 Creating new song:', name);
    const newSong: Song = {
      id: generateSongId(),
      name,
      bpm: 120,
      progressions: [],
      tuning: DEFAULT_TUNING,
      capoSettings: { fret: 0, enabled: false },
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
  }

  function handleSelectSong(song: Song) {
    setCurrentSongId(song.id);
    saveCurrentSong(song.id);
  }

  function handleBackToOverview() {
    setCurrentSongId(null);
    saveCurrentSong('');
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-8">
      <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
        <button 
          onClick={handleBackToOverview}
          className="hover:text-blue-600 transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 rounded px-2 py-1"
          title="Back to Home"
        >
          Chordbook (Simple Test)
        </button>
      </h1>

      <StorageTest />

      {/* Home Page or Song View */}
      {!currentSongId ? (
        <HomePage
          recentSongs={getRecentlyOpenedSongs(songs, 4)}
          allSongs={getSongsByLastOpened(songs)}
          onSelectSong={handleSelectSong}
          onCreateSong={handleCreateSong}
        />
      ) : (
        <div>
          <h2 className="text-xl font-semibold mb-4">Song: {songs.find(s => s.id === currentSongId)?.name}</h2>
          <button 
            onClick={handleBackToOverview}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Overview
          </button>
        </div>
      )}
    </div>
  );
}

export default AppSimple;
