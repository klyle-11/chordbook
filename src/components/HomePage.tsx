import { useState } from 'react';
import type { Song } from '../types/song';
import { formatSongInfo } from '../lib/displayUtils';
import { SecureInputDialog } from './SecureInputDialog';

interface HomePageProps {
  recentSongs: Song[];
  allSongs: Song[];
  onSelectSong: (song: Song) => void;
  onCreateSong: (name: string) => void;
}

export default function HomePage({ 
  recentSongs, 
  allSongs, 
  onSelectSong, 
  onCreateSong 
}: HomePageProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const handleCreateClick = () => {
    setShowCreateDialog(true);
  };

  const handleCreateConfirm = (songName: string) => {
    onCreateSong(songName);
    setShowCreateDialog(false);
  };

  const handleCreateCancel = () => {
    setShowCreateDialog(false);
  };

  const validateSongName = (name: string): string | null => {
    if (name.length < 1) {
      return 'Song name is required';
    }
    if (name.length > 50) {
      return 'Song name must be 50 characters or less';
    }
    if (allSongs.some(song => song.name.toLowerCase() === name.toLowerCase())) {
      return 'A song with this name already exists';
    }
    return null;
  };

  return (
    <div className="max-w-4xl mx-auto"> 
      {/* Recently Opened Songs */}
      {recentSongs.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Recently Opened</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentSongs.map((song) => (
              <div
                key={song.id}
                onClick={() => onSelectSong(song)}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all"
              >
                <div className="mb-2">
                  <h4 className="font-medium text-gray-800 truncate" title={song.name}>
                    {song.name}
                  </h4>
                  <p className="text-sm text-gray-500">
                    {song.progressions.length} progression{song.progressions.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="text-xs text-gray-500">
                  {formatSongInfo(song.tuning, song.capoSettings, song.bpm)}
                </div>
                <div className="text-xs text-gray-400 mt-2">
                  Updated {song.updatedAt.toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create New Song Button */}
      <div className="mb-8">
        <button
          onClick={handleCreateClick}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create New Song
        </button>
      </div>

      {/* All Songs File Picker */}
      {allSongs.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">All Songs</h3>
            <p className="text-sm text-gray-600">Choose from your existing songs</p>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {allSongs.map((song) => (
              <div
                key={song.id}
                onClick={() => onSelectSong(song)}
                className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-800 truncate" title={song.name}>
                        {song.name}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {song.progressions.length} progression{song.progressions.length !== 1 ? 's' : ''} • 
                        Updated {song.updatedAt.toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-.895 2-2 2s-2-.895-2-2 .895-2 2-2 2 .895 2 2zm12-3c0 1.105-.895 2-2 2s-2-.895-2-2 .895-2 2-2 2 .895 2 2z" />
                        </svg>
                        <span>{song.bpm} BPM</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2M7 4h10M7 4l1 14a2 2 0 002 2h4a2 2 0 002-2L17 4M10 8v8M14 8v8" />
                        </svg>
                        <span>{song.tuning.name}</span>
                        {song.capoSettings.enabled && (
                          <span className="text-xs bg-gray-200 px-1 rounded">
                            Capo {song.capoSettings.fret}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="ml-4">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {allSongs.length === 0 && (
        <div className="text-center py-12">
          <div className="mb-4">
            <svg className="w-16 h-16 text-gray-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-.895 2-2 2s-2-.895-2-2 .895-2 2-2 2 .895 2 2zm12-3c0 1.105-.895 2-2 2s-2-.895-2-2 .895-2 2-2 2 .895 2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-800 mb-2">No songs yet</h3>
          <p className="text-gray-600 mb-6">Create your first song to get started</p>
          <button
            onClick={handleCreateClick}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Your First Song
          </button>
        </div>
      )}
      
      {/* Secure Input Dialog for Creating Songs */}
      <SecureInputDialog
        isOpen={showCreateDialog}
        title="Create New Song"
        placeholder="Enter song name..."
        onConfirm={handleCreateConfirm}
        onCancel={handleCreateCancel}
        maxLength={50}
        validator={validateSongName}
      />
    </div>
  );
}
