import React, { useState, useRef, useEffect, useCallback } from 'react';

interface IntegratedMetronomeProps {
  onTempoChange?: (bpm: number) => void;
}

export function IntegratedMetronome({ onTempoChange }: IntegratedMetronomeProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [bpmInput, setBpmInput] = useState('120'); // Separate state for input display
  const [volume, setVolume] = useState(0.5);
  
  // Metronome refs
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const bpmValidationTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Auto-scroll refs
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentChordIndex = useRef<number>(0);

  useEffect(() => {
    // Initialize Web Audio API
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioContextRef.current = new AudioContextClass();
    
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    onTempoChange?.(bpm);
  }, [bpm, onTempoChange]);

  const playClick = useCallback(() => {
    if (!audioContextRef.current) return;

    const context = audioContextRef.current;
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.frequency.setValueAtTime(800, context.currentTime);
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0, context.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, context.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.1);

    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + 0.1);
  }, [volume]);

  const startMetronome = useCallback(() => {
    if (intervalRef.current) return;

    const interval = 60000 / bpm; // Convert BPM to milliseconds
    playClick(); // Play immediately
    
    intervalRef.current = setInterval(() => {
      playClick();
    }, interval);

    setIsPlaying(true);
  }, [bpm, playClick]);

  const stopMetronome = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const startAutoScroll = useCallback(() => {
    if (scrollIntervalRef.current) return;

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
    
    scrollIntervalRef.current = setInterval(scrollToNextChord, interval);
    setIsScrolling(true);
  }, [bpm]);

  const stopAutoScroll = useCallback(() => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
    setIsScrolling(false);
    currentChordIndex.current = 0;
  }, []);

  // Update scroll timing if BPM changes while scrolling
  useEffect(() => {
    if (isScrolling && scrollIntervalRef.current) {
      // Restart with new BPM
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
      
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

      scrollIntervalRef.current = setInterval(scrollToNextChord, interval);
    }
  }, [bpm, isScrolling]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
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
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }
      if (bpmValidationTimerRef.current) {
        clearTimeout(bpmValidationTimerRef.current);
      }
    };
  }, [isScrolling, startAutoScroll, stopAutoScroll]);

  const validateAndSetBpm = useCallback((value: string) => {
    if (value === '') {
      setBpm(120);
      setBpmInput('120');
      return;
    }
    
    const newBpm = parseInt(value, 10);
    if (!isNaN(newBpm)) {
      // Clamp the value between 40 and 300
      const clampedBpm = Math.max(40, Math.min(300, newBpm));
      setBpm(clampedBpm);
      setBpmInput(clampedBpm.toString());
      
      // If playing, restart with new tempo
      if (isPlaying) {
        stopMetronome();
        setTimeout(() => startMetronome(), 50);
      }
    }
  }, [isPlaying, stopMetronome, startMetronome]);

  const handleBpmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Update the input display immediately (allow any input while typing)
    setBpmInput(value);
    
    // Clear any existing timer
    if (bpmValidationTimerRef.current) {
      clearTimeout(bpmValidationTimerRef.current);
    }
    
    // Set a timer to validate after 3 seconds of no typing
    bpmValidationTimerRef.current = setTimeout(() => {
      validateAndSetBpm(value);
    }, 3000);
  };

  const handleBpmBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Clear the timer since we're validating on blur
    if (bpmValidationTimerRef.current) {
      clearTimeout(bpmValidationTimerRef.current);
    }
    
    // Validate immediately when user clicks away
    validateAndSetBpm(e.target.value);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value));
  };

  return (
    <>
      <div className="inline-flex items-center space-x-4 px-5 py-3 bg-gray-50 border border-gray-200 rounded-lg">
        {/* Play/Stop Button */}
        <button
          onClick={isPlaying ? stopMetronome : startMetronome}
          className="px-4 py-2 rounded font-medium transition-colors bg-gray-300 text-gray-700 hover:bg-gray-400 hover:text-white"
        >
          {isPlaying ? '⏸️' : '▶️'}
        </button>

        {/* Auto Scroll Button */}
        <button
          onClick={isScrolling ? stopAutoScroll : startAutoScroll}
          className={`text-sm transition-all duration-200 underline ${
            isScrolling
              ? 'text-green-600 hover:text-green-700 font-medium shadow-[0_0_8px_rgba(34,197,94,0.6)] text-shadow'
              : 'text-gray-600 hover:text-gray-800'
          }`}
          style={isScrolling ? { textShadow: '0 0 8px rgba(34, 197, 94, 0.8)' } : {}}
        >
          {isScrolling ? 'Stop' : 'Auto Scroll'}
        </button>

        {/* BPM Input */}
        <div className="flex items-center space-x-2">
          <label htmlFor="bpm" className="text-sm font-medium text-gray-700">
            BPM:
          </label>
          <input
            id="bpm"
            type="number"
            min="40"
            max="300"
            value={bpmInput}
            onChange={handleBpmChange}
            onBlur={handleBpmBlur}
            className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Volume Control */}
        <div className="flex items-center space-x-2">
          <label htmlFor="volume" className="text-sm font-medium text-gray-700">
            🔊
          </label>
          <input
            id="volume"
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={handleVolumeChange}
            className="w-20 h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer slider accent-blue-500"
          />
          <span className="text-xs text-gray-500 w-8">
            {Math.round(volume * 100)}%
          </span>
        </div>

        {/* Beat Indicator */}
        <div
          className={`w-4 h-4 rounded-full transition-colors duration-100 ${
            isPlaying ? 'bg-blue-400 animate-pulse' : 'bg-gray-300'
          }`}
        />

        {/* Keyboard Shortcut Hint */}
        <div className="text-xs text-gray-500 hidden lg:block">
          Space: toggle scroll
        </div>
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
