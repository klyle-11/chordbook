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
  if (progressions.length === 0) {
    return (
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-800">Saved Progressions</h3>
          <button
            onClick={onNewProgression}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            New Progression
          </button>
        </div>
        <p className="text-gray-600">No saved progressions yet.</p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-gray-800">Saved Progressions</h3>
        <button
          onClick={onNewProgression}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          New Progression
        </button>
      </div>
      
      <div className="space-y-2">
        {progressions.map((progression) => (
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
                onClick={() => onDeleteProgression(progression.id)}
                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
