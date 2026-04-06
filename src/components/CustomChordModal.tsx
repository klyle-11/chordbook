import { useState } from 'react';
import { addCustomChord } from '../lib/customChordLibrary';

interface CustomChordModalProps {
  onClose: () => void;
  onAdded?: (name: string) => void;
  initialNotes?: string[];
  initialName?: string;
}

export default function CustomChordModal({ onClose, onAdded, initialNotes = [], initialName = '' }: CustomChordModalProps) {
  const [name, setName] = useState(initialName);
  const [notes, setNotes] = useState(initialNotes.join(', '));
  const [error, setError] = useState('');

  const handleSave = () => {
    const noteArr = notes.split(',').map(n => n.trim()).filter(Boolean);
    if (!name || noteArr.length === 0) {
      setError('Please enter a name and at least one note.');
      return;
    }
    const success = addCustomChord(name, noteArr);
    if (!success) {
      setError('A custom chord with these notes already exists.');
      return;
    }
    if (onAdded) onAdded(name);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-80">
        <h2 className="text-lg font-bold mb-4">Add Custom Chord</h2>
        <label className="block mb-2 text-sm font-medium">Chord Name</label>
        <input
          type="text"
          className="w-full border rounded px-2 py-1 mb-3"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Em (6 string barre)"
        />
        <label className="block mb-2 text-sm font-medium">Notes (comma separated)</label>
        <input
          type="text"
          className="w-full border rounded px-2 py-1 mb-3"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="e.g. E, G, B"
        />
        {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
        <div className="flex justify-end gap-2 mt-4">
          <button className="px-3 py-1 rounded bg-gray-200" onClick={onClose}>Cancel</button>
          <button className="px-3 py-1 rounded bg-blue-600 text-white" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}
