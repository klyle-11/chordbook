import { useState } from 'react';
import type { Chord } from '../types/chord';
import type { Tuning } from '../lib/tunings';
import { isCustomChord } from '../lib/customChordLibrary';
import { TraditionalChordDiagram } from './TraditionalChordDiagram';

interface ChordIconsProps {
  chords: Chord[];
  tuning: Tuning;
  className?: string;
}

export function ChordIcons({ chords, tuning, className = "" }: ChordIconsProps) {
  const [hoveredChord, setHoveredChord] = useState<string | null>(null);
  const [showAllDiagrams, setShowAllDiagrams] = useState<boolean>(false);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);

  if (chords.length === 0) {
    return null;
  }

  // Get unique traditional chords (non-custom) for the all diagrams display
  const traditionalChords = chords.filter(chord => !isCustomChord(chord.name));
  const uniqueTraditionalChords = traditionalChords.filter((chord, index, arr) => 
    arr.findIndex(c => c.name === chord.name) === index
  );

  const handleChordClick = () => {
    if (isAnimating) return; // Prevent multiple clicks during animation
    
    setIsAnimating(true);
    setShowAllDiagrams(!showAllDiagrams);
    setHoveredChord(null); // Clear hover state when clicking
    
    // Reset animation state after transition completes
    setTimeout(() => {
      setIsAnimating(false);
    }, 300); // Match the CSS transition duration
  };

  return (
    <div className={`${className}`}>
      <div className="flex items-center gap-2 flex-wrap">
        {chords.map((chord, index) => {
          const isCustom = isCustomChord(chord.name);
          
          return (
            <div key={`${chord.name}-${index}`} className="relative">
              <span
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200 cursor-pointer hover:bg-blue-200 transition-all duration-200 hover:scale-105 transform active:scale-95"
                onMouseEnter={() => !isCustom && !showAllDiagrams && setHoveredChord(`${chord.name}-${index}`)}
                onMouseLeave={() => setHoveredChord(null)}
                onClick={handleChordClick}
              >
                {chord.name}
              </span>
              
              {/* Traditional chord diagram flyout (only show on hover if not showing all diagrams) */}
              {!isCustom && !showAllDiagrams && hoveredChord === `${chord.name}-${index}` && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50 animate-fade-in">
                  <TraditionalChordDiagram chordName={chord.name} tuning={tuning} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* All chord diagrams display with smooth animation */}
      <div 
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          showAllDiagrams ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        {uniqueTraditionalChords.length > 0 && (
          <div className={`mt-4 p-4 bg-gray-50 rounded-lg border transform transition-all duration-300 ease-out ${
            showAllDiagrams ? 'translate-y-0 scale-100 animate-bounce-in' : 'translate-y-4 scale-95'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-800">Chord Diagrams</h3>
              <button
                onClick={() => setShowAllDiagrams(false)}
                className="text-gray-500 hover:text-gray-700 text-sm transition-colors duration-200 hover:scale-110 transform"
              >
                ✕ Close
              </button>
            </div>
            <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 transition-all duration-300 ${
              showAllDiagrams ? 'opacity-100' : 'opacity-0'
            }`}>
              {uniqueTraditionalChords.map((chord, index) => (
                <div
                  key={`diagram-${chord.name}-${index}`}
                  className={`transform transition-all duration-300 ease-out ${
                    showAllDiagrams 
                      ? 'translate-y-0 opacity-100 scale-100' 
                      : 'translate-y-4 opacity-0 scale-95'
                  }`}
                  style={{ 
                    transitionDelay: showAllDiagrams ? `${index * 50}ms` : '0ms' 
                  }}
                >
                  <TraditionalChordDiagram 
                    chordName={chord.name} 
                    tuning={tuning} 
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
