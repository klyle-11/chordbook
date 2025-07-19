import { useState } from 'react';
import { getUniqueNotesFromSong, describeSongScale } from '../lib/songAnalysis';
import Fretboard from './Fretboard';
import type { Song } from '../types/song';

interface SongScaleProps {
  song: Song;
}

export default function SongScale({ song }: SongScaleProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const uniqueNotes = getUniqueNotesFromSong(song);
  const scaleDescription = describeSongScale(song);

  if (uniqueNotes.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 sm:p-6 border border-gray-200">
        <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-2">Song Scale</h3>
        <p className="text-sm sm:text-base text-gray-600 italic">Add chords to your progressions to see the song's scale</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header with expand/collapse toggle */}
      <div className="p-3 sm:p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              <svg 
                className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            
            <div className="min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 truncate">Song Scale</h3>
              <p className="text-xs sm:text-sm text-gray-600 truncate">{scaleDescription}</p>
            </div>
          </div>
          
          {/* Notes count indicator */}
          <div className="text-xs sm:text-sm text-gray-500 flex-shrink-0 ml-2">
            {uniqueNotes.length} notes
          </div>
        </div>
        
        {/* Notes display - always visible */}
        <div className="flex flex-wrap gap-1 sm:gap-2 mt-2 sm:mt-3">
          {uniqueNotes.map((note) => (
            <span
              key={note}
              className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-blue-100 text-blue-800"
            >
              {note}
            </span>
          ))}
        </div>
      </div>

      {/* Expanded Content - Fretboard */}
      {isExpanded && (
        <div className="p-3 sm:p-4">
          <div className="flex justify-start">
            <div className="w-full border border-gray-200 rounded-lg p-3 sm:p-4 bg-gray-50">
              <h4 className="text-sm sm:text-base font-medium text-gray-700 mb-2 sm:mb-3">
                All Notes on Fretboard
              </h4>
              <div className="overflow-x-auto">
                <Fretboard 
                  chordNotes={uniqueNotes} 
                  tuning={song.tuning}
                  capoSettings={song.capoSettings}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                This fretboard shows all {uniqueNotes.length} unique notes from your {song.progressions.length} progression{song.progressions.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
