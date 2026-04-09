import { useState } from 'react';
import { audioPlayer, INSTRUMENTS, type InstrumentId, type StrumMode } from '../lib/audioPlayer';

export function InstrumentSelector() {
  const [current, setCurrent] = useState<InstrumentId>(audioPlayer.getInstrument());
  const [strumMode, setStrumMode] = useState<StrumMode>(audioPlayer.getStrumMode());

  const handleChange = (id: InstrumentId) => {
    audioPlayer.setInstrument(id);
    setCurrent(id);
  };

  const toggleStrumMode = () => {
    const next: StrumMode = strumMode === 'strum' ? 'simultaneous' : 'strum';
    audioPlayer.setStrumMode(next);
    setStrumMode(next);
  };

  return (
    <div className="flex items-center gap-1">
      <select
        value={current}
        onChange={(e) => handleChange(e.target.value as InstrumentId)}
        className="px-2 py-1 text-xs rounded transition-colors appearance-none cursor-pointer"
        style={{
          background: 'var(--bg-secondary)',
          color: 'var(--text)',
          border: '1px solid var(--border)',
          paddingRight: '20px',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23999' fill='none' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 6px center',
        }}
      >
        {INSTRUMENTS.map((inst) => (
          <option key={inst.id} value={inst.id}>
            {inst.name}
          </option>
        ))}
      </select>
      <button
        onClick={toggleStrumMode}
        className="px-2 py-1 text-xs rounded transition-colors"
        style={{
          background: 'var(--bg-secondary)',
          color: 'var(--text-secondary)',
          border: '1px solid var(--border)',
        }}
        title={strumMode === 'strum' ? 'Strum: notes play sequentially' : 'Chord: all notes play at once'}
      >
        {strumMode === 'strum' ? (
          <span className="flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v18" />
              <path d="M8 7l4-4 4 4" />
              <path d="M6 11h4M14 15h4" />
            </svg>
            Strum
          </span>
        ) : (
          <span className="flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12h16" />
              <path d="M7 8v8M12 8v8M17 8v8" />
            </svg>
            Chord
          </span>
        )}
      </button>
    </div>
  );
}
