import { TUNINGS, type Tuning, type CapoSettings } from '../lib/tunings';

interface TuningSelectorProps {
  currentTuning: Tuning;
  onTuningChange: (tuning: Tuning) => void;
  capoSettings: CapoSettings;
  onCapoChange: (settings: CapoSettings) => void;
}

export default function TuningSelector({ currentTuning, onTuningChange, capoSettings, onCapoChange }: TuningSelectorProps) {
  const handleFretChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const fret = parseInt(e.target.value);
    onCapoChange({ fret, enabled: fret > 0 });
  };

  return (
    <div className="instrument-strip">
      {/* Tuning */}
      <div className="instrument-strip__group">
        <label htmlFor="tuning-select" className="instrument-strip__label">Tuning</label>
        <select
          id="tuning-select"
          value={currentTuning.id}
          onChange={e => {
            const t = TUNINGS.find(t => t.id === e.target.value);
            if (t) onTuningChange(t);
          }}
          className="instrument-strip__select"
        >
          {TUNINGS.map(tuning => (
            <option key={tuning.id} value={tuning.id}>{tuning.name}</option>
          ))}
        </select>
      </div>

      <div className="instrument-strip__sep" />

      {/* Capo */}
      <div className="instrument-strip__group">
        <button
          onClick={() => onCapoChange({ ...capoSettings, enabled: !capoSettings.enabled })}
          className="instrument-strip__capo-toggle"
          data-active={capoSettings.enabled}
          aria-label={capoSettings.enabled ? 'Disable capo' : 'Enable capo'}
          title={capoSettings.enabled ? 'Capo on' : 'Capo off'}
        >
          Capo
        </button>
        <select
          value={capoSettings.fret}
          onChange={handleFretChange}
          disabled={!capoSettings.enabled}
          className="instrument-strip__select instrument-strip__select--narrow"
          aria-label="Capo fret"
        >
          <option value={0}>Off</option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map(fret => (
            <option key={fret} value={fret}>Fret {fret}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
