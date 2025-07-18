import { useState, useEffect } from 'react';
import { audioPlayer } from '../lib/audioPlayer';

export default function VolumeSlider() {
  const [volume, setVolume] = useState(audioPlayer.getVolume());
  const [isMuted, setIsMuted] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);

  useEffect(() => {
    audioPlayer.setVolume(isMuted ? 0 : volume);
  }, [volume, isMuted]);

  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(event.target.value);
    setVolume(newVolume);
    if (newVolume > 0) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleMouseEnter = () => {
    setIsInteracting(true);
  };

  const handleMouseLeave = () => {
    setIsInteracting(false);
  };

  const handleMouseDown = () => {
    setIsInteracting(true);
  };

  const handleMouseUp = () => {
    // Keep it visible for a moment after releasing
    setTimeout(() => setIsInteracting(false), 500);
  };

  const displayVolume = isMuted ? 0 : volume;

  return (
    <div 
      className={`fixed top-4 right-4 z-50 flex items-center gap-3 bg-white rounded-lg px-4 py-2 shadow-lg border border-gray-200 transition-opacity duration-300 ${
        isInteracting ? 'opacity-100' : 'opacity-30 hover:opacity-100'
      }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      <button
        onClick={toggleMute}
        className="text-gray-600 hover:text-gray-800 transition-colors p-1"
        title={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted || volume === 0 ? (
          // Muted icon
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
          </svg>
        ) : (
          // Volume icon
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
          </svg>
        )}
      </button>
      
      <div className="flex items-center gap-2 min-w-[120px]">
        <span className="text-xs text-gray-500 w-8">
          {Math.round(displayVolume * 100)}%
        </span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={isMuted ? 0 : volume}
          onChange={handleVolumeChange}
          className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          style={{
            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${displayVolume * 100}%, #e5e7eb ${displayVolume * 100}%, #e5e7eb 100%)`
          }}
        />
      </div>
    </div>
  );
}
