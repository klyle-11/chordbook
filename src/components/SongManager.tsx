import { useState } from 'react';
import type { Song } from '../types/song';
import { EditableText } from './EditableText';
import { DEFAULT_TUNING } from '../lib/tunings';
import { BpmInput } from './BpmInput';
import PDFExportDialog from './PDFExportDialog';

interface SongManagerProps {
  songs: Song[];
  currentSong: Song | null;
  onSelectSong: (song: Song) => void;
  onCreateSong: (name: string) => void;
  onRenameSong: (songId: string, newName: string) => void;
  onUpdateSongBpm?: (songId: string, bpm: number) => void;
  onDeleteSong: (songId: string) => void;
  onBackToOverview: () => void;
}

export default function SongManager({
  songs,
  currentSong,
  onSelectSong,
  onCreateSong,
  onRenameSong,
  onUpdateSongBpm,
  onDeleteSong,
  onBackToOverview
}: SongManagerProps) {
  const [showNewSongForm, setShowNewSongForm] = useState(false);
  const [newSongName, setNewSongName] = useState('');
  const [songToDelete, setSongToDelete] = useState<string | null>(null);
  const [showPDFExport, setShowPDFExport] = useState(false);
  const [showAllSongs, setShowAllSongs] = useState(false);

  // Sort songs by lastOpened date (most recent first)
  const sortedSongs = [...songs].sort((a, b) => {
    const aLastOpened = a.lastOpened?.getTime() || 0;
    const bLastOpened = b.lastOpened?.getTime() || 0;
    return bLastOpened - aLastOpened;
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
    if (e.key === 'Enter') {
      handleCreateSong();
    } else if (e.key === 'Escape') {
      setShowNewSongForm(false);
      setNewSongName('');
    }
  };

  const renderSongCard = (song: Song, showBpmTuning = false) => (
    <div
      key={song.id}
      onClick={() => onSelectSong(song)}
      className="p-6 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md cursor-pointer transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900 truncate flex-1">
          {song.name}
        </h3>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteClick(song.id);
          }}
          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
      
      <div className="text-sm text-gray-600 mb-3">
        {song.progressions.length} progression{song.progressions.length !== 1 ? 's' : ''}
        {song.lastOpened && (
          <span className="text-gray-400 ml-2">
            • Last opened: {song.lastOpened.toLocaleDateString()}
          </span>
        )}
      </div>

      {showBpmTuning && (
        <div className="text-sm text-gray-500 mb-3 flex gap-4">
          <span>BPM: {song.bpm || 120}</span>
          <span>Tuning: {song.tuning?.name || DEFAULT_TUNING.name}</span>
        </div>
      )}

      {song.progressions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {song.progressions.slice(0, 3).map((progression, index) => (
            <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
              {progression.name}
            </span>
          ))}
          {song.progressions.length > 3 && (
            <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded text-xs">
              +{song.progressions.length - 3} more
            </span>
          )}
        </div>
      )}
    </div>
  );

  const handleDeleteClick = (songId: string) => {
    setSongToDelete(songId);
  };

  const handleConfirmDelete = () => {
    if (songToDelete) {
      onDeleteSong(songToDelete);
      setSongToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setSongToDelete(null);
  };

  // If viewing a specific song, show the back button and song title
  if (currentSong) {
    return (
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBackToOverview}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              All Songs
            </button>
            <div className="h-6 w-px bg-gray-300"></div>
            <div>
              <EditableText
                value={currentSong.name}
                onChange={(newName) => onRenameSong(currentSong.id, newName)}
                className="text-2xl font-bold text-gray-900"
                placeholder="Song name..."
              />
              <div className="flex items-center gap-4 mt-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-gray-600">
                    {currentSong.progressions.length} progression{currentSong.progressions.length !== 1 ? 's' : ''}
                  </p>
                </div>
                {onUpdateSongBpm && (
                  <BpmInput
                    bpm={currentSong.bpm}
                    onChange={(bpm) => onUpdateSongBpm(currentSong.id, bpm)}
                    size="sm"
                  />
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                console.log('PDF Export button clicked, showPDFExport:', showPDFExport);
                setShowPDFExport(true);
                console.log('After setShowPDFExport(true)');
              }}
              className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export PDF
            </button>
            
            <button
              onClick={() => handleDeleteClick(currentSong.id)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete Song
            </button>
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        {songToDelete === currentSong.id && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-1.964-.833-2.732 0l-8.998 10c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Delete Song</h3>
                  <p className="text-sm text-gray-600">This action cannot be undone</p>
                </div>
              </div>
              
              <p className="text-gray-700 mb-6">
                Are you sure you want to delete "<strong>{currentSong.name}</strong>"? 
                This will permanently remove the song and all {currentSong.progressions.length} progression{currentSong.progressions.length !== 1 ? 's' : ''} it contains.
              </p>
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleCancelDelete}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-md transition-colors"
                >
                  Delete Song
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Show song overview/selection
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Songs</h2>
        <button
          onClick={() => setShowNewSongForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Song
        </button>
      </div>

      {/* New Song Form */}
      {showNewSongForm && (
        <div className="mb-6 p-4 border border-blue-200 rounded-lg bg-blue-50">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newSongName}
              onChange={(e) => setNewSongName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter song name..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
            <button
              onClick={handleCreateSong}
              disabled={!newSongName.trim()}
              className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Create
            </button>
            <button
              onClick={() => {
                setShowNewSongForm(false);
                setNewSongName('');
              }}
              className="px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Songs List */}
      {songs.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="text-6xl mb-4">🎵</div>
          <p className="text-lg text-gray-600 mb-2">No songs yet</p>
          <p className="text-sm text-gray-500">Create your first song to get started</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Recent Songs Section */}
          {recentSongs.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Songs</h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {recentSongs.map((song) => renderSongCard(song))}
              </div>
            </div>
          )}

          {/* All Songs File Picker */}
          {remainingSongs.length > 0 && (
            <div>
              <button
                onClick={() => setShowAllSongs(!showAllSongs)}
                className="flex items-center gap-2 text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors mb-4"
              >
                <svg 
                  className={`w-5 h-5 transition-transform ${showAllSongs ? 'rotate-90' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                All Songs ({remainingSongs.length})
              </button>
              
              {showAllSongs && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {remainingSongs.map((song) => renderSongCard(song, true))}
                </div>
              )}
            </div>
          )}

          {/* Show all songs in a single grid if no recent songs */}
          {recentSongs.length === 0 && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sortedSongs.map((song) => renderSongCard(song, true))}
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog for Overview */}
      {songToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-1.964-.833-2.732 0l-8.998 10c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Song</h3>
                <p className="text-sm text-gray-600">This action cannot be undone</p>
              </div>
            </div>
            
            {(() => {
              const songToDeleteData = songs.find(s => s.id === songToDelete);
              return songToDeleteData ? (
                <p className="text-gray-700 mb-6">
                  Are you sure you want to delete "<strong>{songToDeleteData.name}</strong>"? 
                  This will permanently remove the song and all {songToDeleteData.progressions.length} progression{songToDeleteData.progressions.length !== 1 ? 's' : ''} it contains.
                </p>
              ) : (
                <p className="text-gray-700 mb-6">
                  Are you sure you want to delete this song? This action cannot be undone.
                </p>
              );
            })()}
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCancelDelete}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-md transition-colors"
              >
                Delete Song
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Export Dialog */}
      {currentSong && (
        <PDFExportDialog
          song={currentSong}
          isOpen={showPDFExport}
          onClose={() => setShowPDFExport(false)}
        />
      )}
    </div>
  );
}
