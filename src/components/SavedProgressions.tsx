import { useState } from 'react';
import type { Progression } from '../types/progression';
import { formatProgressionDateTime } from '../lib/progressionStorage';

interface SavedProgressionsProps {
  progressions: Progression[];
  currentProgressionId: string | null;
  onLoadProgression: (progressionId: string) => void;
  onDeleteProgression: (progressionId: string) => void;
  onNewProgression: () => void;
}

export default function SavedProgressions({ 
  progressions, 
  currentProgressionId, 
  onLoadProgression, 
  onDeleteProgression,
  onNewProgression 
}: SavedProgressionsProps) {
  const [showAll, setShowAll] = useState(false);
  
  // Sort progressions by updated date (latest first)
  const sortedProgressions = [...progressions].sort((a, b) => 
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  
  // Show only 5 most recent unless expanded
  const displayedProgressions = showAll ? sortedProgressions : sortedProgressions.slice(0, 5);
  const hasMore = sortedProgressions.length > 5;

  if (progressions.length === 0) {
    return (
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-800">Saved chord progressions</h3>
          <button
            onClick={onNewProgression}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            New chord progressions
          </button>
        </div>
        <p className="text-gray-600">No saved progressions yet.</p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-xl font-semibold text-gray-800">Saved chord progressions</h3>
          <p className="text-sm text-gray-600">
            {showAll ? `Showing all ${sortedProgressions.length}` : `Showing ${Math.min(5, sortedProgressions.length)} of ${sortedProgressions.length}`} chord progressions
          </p>
        </div>
        <button
          onClick={onNewProgression}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          New chord progression
        </button>
      </div>
      
      <div className="space-y-2">
        {displayedProgressions.map((progression) => (
          <div
            key={progression.id}
            className={`flex items-center justify-between p-3 rounded border bg-white shadow-sm ${
              progression.id === currentProgressionId
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex-1">
              <h4 className="font-medium text-gray-800">{progression.name}</h4>
              <p className="text-sm text-gray-600">
                {formatProgressionDateTime(progression.updatedAt)} • {progression.chords.length} chords
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {progression.chords.map(chord => chord.name).join(' - ')}
              </p>
            </div>
            
            <div className="flex gap-2">
              {progression.id !== currentProgressionId && (
                <button
                  onClick={() => onLoadProgression(progression.id)}
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Load
                </button>
              )}
              <button
                onClick={() => {
                  if (window.confirm(`Are you sure you want to delete "${progression.name}"? This action cannot be undone.`)) {
                    onDeleteProgression(progression.id);
                  }
                }}
                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                title="Delete progression"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {/* Show/Hide button for full library */}
      {hasMore && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setShowAll(!showAll)}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            {showAll ? 'Show Recent Only' : `Show All ${sortedProgressions.length} Progressions`}
          </button>
        </div>
      )}
    </div>
  );
}
