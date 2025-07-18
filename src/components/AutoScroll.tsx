import { useState, useRef, useEffect, useCallback } from 'react';

interface AutoScrollProps {
  bpm?: number;
}

export function AutoScroll({ bpm = 120 }: AutoScrollProps) {
  const [isScrolling, setIsScrolling] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentChordIndex = useRef<number>(0);

  const startAutoScroll = useCallback(() => {
    if (intervalRef.current) return;

    // Calculate interval based on BPM divided by 4 (quarter note speed)
    const interval = (60000 / bpm) * 4; // milliseconds per chord (4 beats per chord)
    currentChordIndex.current = 0;

    const scrollToNextChord = () => {
      // Find all chord diagram elements
      const chordElements = document.querySelectorAll('[data-chord-diagram]');
      
      if (chordElements.length === 0) return;

      // If we've reached the end, scroll back to top and reset
      if (currentChordIndex.current >= chordElements.length) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        currentChordIndex.current = 0;
        return;
      }

      // Scroll to current chord
      const currentChord = chordElements[currentChordIndex.current];
      currentChord.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });

      currentChordIndex.current++;
    };

    // Start immediately
    scrollToNextChord();
    
    intervalRef.current = setInterval(scrollToNextChord, interval);
    setIsScrolling(true);
  }, [bpm]);

  const stopAutoScroll = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsScrolling(false);
    currentChordIndex.current = 0;
  }, []);

  // Update scroll timing if BPM changes while scrolling
  useEffect(() => {
    if (isScrolling && intervalRef.current) {
      // Restart with new BPM
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      
      const interval = (60000 / bpm) * 4; // BPM divided by 4
      const scrollToNextChord = () => {
        const chordElements = document.querySelectorAll('[data-chord-diagram]');
        
        if (chordElements.length === 0) return;

        if (currentChordIndex.current >= chordElements.length) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          currentChordIndex.current = 0;
          return;
        }

        const currentChord = chordElements[currentChordIndex.current];
        currentChord.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });

        currentChordIndex.current++;
      };

      intervalRef.current = setInterval(scrollToNextChord, interval);
    }
  }, [bpm, isScrolling, stopAutoScroll]);

  // Cleanup on unmount
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if user is focused on an input element
      const activeElement = document.activeElement;
      const isInputFocused = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.tagName === 'SELECT' ||
        (activeElement as HTMLElement).contentEditable === 'true'
      );

      // Handle Escape key to stop autoscroll
      if (event.key === 'Escape' && isScrolling) {
        event.preventDefault();
        stopAutoScroll();
      }

      // Handle Spacebar to toggle autoscroll (only if not in input)
      if (event.key === ' ' && !isInputFocused) {
        event.preventDefault();
        if (isScrolling) {
          stopAutoScroll();
        } else {
          startAutoScroll();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isScrolling, startAutoScroll, stopAutoScroll]);

  return (
    <>
      <div className="flex items-center space-x-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
        {/* Auto Scroll Button */}
        <button
          onClick={isScrolling ? stopAutoScroll : startAutoScroll}
          className={`px-4 py-2 rounded font-medium transition-colors ${
            isScrolling
              ? 'bg-red-500 text-white hover:bg-red-600 font-bold'
              : 'bg-gray-300 text-gray-700 hover:bg-gray-400 hover:text-white'
          }`}
        >
          {isScrolling ? '⏸️ STOP SCROLL' : '📜 Auto Scroll'}
        </button>

        {/* BPM Display */}
        <div className="text-sm text-gray-600">
          {bpm} BPM (chord every 4 beats)
        </div>

        {/* Keyboard Shortcut Hint */}
        <div className="text-xs text-gray-500 hidden sm:block">
          Press Space to toggle
        </div>

        {/* Scroll Indicator */}
        <div
          className={`w-3 h-3 rounded-full transition-colors duration-200 ${
            isScrolling ? 'bg-red-400 animate-pulse' : 'bg-gray-300'
          }`}
        />
      </div>

      {/* Floating Stop Button - appears when scrolling */}
      {isScrolling && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={stopAutoScroll}
            className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-full shadow-lg text-lg transition-all duration-200 hover:scale-105"
          >
            ⏸️ STOP
          </button>
        </div>
      )}
    </>
  );
}
