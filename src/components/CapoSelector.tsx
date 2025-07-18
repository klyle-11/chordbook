import React from 'react';
import type { CapoSettings } from '../lib/tunings';

interface CapoSelectorProps {
  capoSettings: CapoSettings;
  onCapoChange: (settings: CapoSettings) => void;
}

export function CapoSelector({ capoSettings, onCapoChange }: CapoSelectorProps) {
  const handleFretChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const fret = parseInt(event.target.value);
    onCapoChange({
      fret,
      enabled: fret > 0
    });
  };

  const handleToggle = () => {
    onCapoChange({
      ...capoSettings,
      enabled: !capoSettings.enabled
    });
  };

  return (
    <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-lg p-3 shadow-sm border border-gray-200">
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <input
          type="checkbox"
          checked={capoSettings.enabled}
          onChange={handleToggle}
          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
        />
        Capo
      </label>
      
      <select
        value={capoSettings.fret}
        onChange={handleFretChange}
        disabled={!capoSettings.enabled}
        className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
      >
        <option value={0}>No Capo</option>
        {Array.from({ length: 12 }, (_, i) => i + 1).map(fret => (
          <option key={fret} value={fret}>
            Fret {fret}
          </option>
        ))}
      </select>
    </div>
  );
}
