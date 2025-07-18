import React, { useState, useRef, useEffect } from 'react';

interface MetronomeProps {
  onTempoChange?: (bpm: number) => void;
}

export function Metronome({ onTempoChange }: MetronomeProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [volume, setVolume] = useState(0.5);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

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

  const playClick = () => {
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
  };

  const startMetronome = () => {
    if (intervalRef.current) return;

    const interval = 60000 / bpm; // Convert BPM to milliseconds
    playClick(); // Play immediately
    
    intervalRef.current = setInterval(() => {
      playClick();
    }, interval);

    setIsPlaying(true);
  };

  const stopMetronome = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPlaying(false);
  };

  const handleBpmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Allow empty input while typing
    if (value === '') {
      setBpm(120); // Default value when empty
      return;
    }
    
    const newBpm = parseInt(value, 10);
    if (!isNaN(newBpm) && newBpm >= 40 && newBpm <= 300) {
      setBpm(newBpm);
      
      // If playing, restart with new tempo
      if (isPlaying) {
        stopMetronome();
        setTimeout(() => startMetronome(), 50);
      }
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value));
  };

  return (
    <div className="flex items-center space-x-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
      {/* Play/Stop Button */}
      <button
        onClick={isPlaying ? stopMetronome : startMetronome}
        className={`px-4 py-2 rounded font-medium transition-colors ${
          isPlaying
            ? 'bg-gray-400 text-white hover:bg-gray-500'
            : 'bg-gray-300 text-gray-700 hover:bg-gray-400 hover:text-white'
        }`}
      >
        {isPlaying ? '⏸️ Stop' : '▶️ Start'}
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
          value={bpm}
          onChange={handleBpmChange}
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
          className="w-20 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
        />
        <span className="text-xs text-gray-500 w-8">
          {Math.round(volume * 100)}%
        </span>
      </div>

      {/* Beat Indicator */}
      <div
        className={`w-4 h-4 rounded-full transition-colors duration-100 ${
          isPlaying ? 'bg-gray-400 animate-pulse' : 'bg-gray-300'
        }`}
      />
    </div>
  );
}
