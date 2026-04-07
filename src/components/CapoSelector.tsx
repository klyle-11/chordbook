import React from 'react';
import type { CapoSettings } from '../lib/tunings';

interface CapoSelectorProps {
  capoSettings: CapoSettings;
  onCapoChange: (settings: CapoSettings) => void;
}

export function CapoSelector({ capoSettings, onCapoChange }: CapoSelectorProps) {
  const handleFretChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const fret = parseInt(event.target.value);
    onCapoChange({ fret, enabled: fret > 0 });
  };

  return (
    <div className="flex items-center gap-3 rounded-lg px-4 py-2" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <label className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>
        <input
          type="checkbox"
          checked={capoSettings.enabled}
          onChange={() => onCapoChange({ ...capoSettings, enabled: !capoSettings.enabled })}
          className="w-4 h-4 rounded"
          style={{ accentColor: 'var(--accent)' }}
        />
        Capo
      </label>
      <select
        value={capoSettings.fret}
        onChange={handleFretChange}
        disabled={!capoSettings.enabled}
        className="themed-input py-1 disabled:opacity-40"
      >
        <option value={0}>No Capo</option>
        {Array.from({ length: 12 }, (_, i) => i + 1).map(fret => (
          <option key={fret} value={fret}>Fret {fret}</option>
        ))}
      </select>
    </div>
  );
}
