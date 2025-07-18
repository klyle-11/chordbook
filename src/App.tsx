import { useState, useEffect, useCallback } from 'react'
import { getNotesForChord } from './lib/chordUtils';
import type { Chord as ChordType } from './types/chord';
import type { Progression } from './types/progression';
import { DEFAULT_TUNING, type Tuning, type CapoSettings } from './lib/tunings';
import { 
  saveProgressions, 
  loadProgressions, 
  saveCurrentProgression, 
  loadCurrentProgression,
  generateProgressionId 
} from './lib/progressionStorage';

import ChordForm from './components/ChordForm';
import ProgressionList from './components/ProgressionList';
import SavedProgressions from './components/SavedProgressions';
import SortableChordGrid from './components/SortableChordGrid';
import VolumeSlider from './components/VolumeSlider';
import TuningSelector from './components/TuningSelector';
import { CapoSelector } from './components/CapoSelector';
import { EditableText } from './components/EditableText';
import { ChordIcons } from './components/ChordIcons';

function App() {
  const [progression, setProgression] = useState<ChordType[]>([]);
  const [replacingIndex, setReplacingIndex] = useState<number | null>(null);
  const [savedProgressions, setSavedProgressions] = useState<Progression[]>([]);
  const [currentProgressionId, setCurrentProgressionId] = useState<string | null>(null);
  const [currentProgressionName, setCurrentProgressionName] = useState<string>('Untitled');
  const [currentTuning, setCurrentTuning] = useState<Tuning>(DEFAULT_TUNING);
  const [capoSettings, setCapoSettings] = useState<CapoSettings>({ fret: 0, enabled: false });

  // Load saved progressions on app start
  useEffect(() => {
    const progressions = loadProgressions();
    setSavedProgressions(progressions);
    
    const currentId = loadCurrentProgression();
    if (currentId) {
      const currentProgression = progressions.find(p => p.id === currentId);
      if (currentProgression) {
        setCurrentProgressionId(currentId);
        setProgression(currentProgression.chords);
        setCurrentProgressionName(currentProgression.name);
      }
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

  function addChord(name: string) {
    const notes = getNotesForChord(name);
    const newChord: ChordType = { name, notes };
    
    if (replacingIndex !== null) {
      // Replace existing chord
      setProgression((prev) => 
        prev.map((chord, index) => index === replacingIndex ? newChord : chord)
      );
      setReplacingIndex(null);
    } else {
      // Add new chord
      setProgression((prev) => [...prev, newChord]);
    }
  }

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

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-8">
      <VolumeSlider />
      <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">Chordbook</h1>
      
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
      
      {/* Progression Name with Chord Icons */}
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <div className="min-w-0">
            <EditableText 
              value={currentProgressionName}
              onChange={setCurrentProgressionName}
              placeholder="Click to edit progression name..."
            />
          </div>
          {progression.length > 0 && (
            <ChordIcons chords={progression} className="flex-shrink-0" />
          )}
        </div>
      </div>
      
      <ChordForm onAddChord={addChord} />
      
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
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Chords</h2>
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
        />
      )}
      
      <SavedProgressions
        progressions={savedProgressions}
        currentProgressionId={currentProgressionId}
        onLoadProgression={loadProgression}
        onDeleteProgression={deleteProgression}
        onNewProgression={newProgression}
      />
    </div>
  )
}

export default App
