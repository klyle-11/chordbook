import { TUNINGS, type Tuning, type CapoSettings } from '../lib/tunings';

interface TuningSelectorProps {
  currentTuning: Tuning;
  onTuningChange: (tuning: Tuning) => void;
  capoSettings: CapoSettings;
  onCapoChange: (settings: CapoSettings) => void;
}

export default function TuningSelector({ currentTuning, onTuningChange, capoSettings, onCapoChange }: TuningSelectorProps) {
  return (
    <div className="instrument-strip">
      {/* Tuning */}
      <div className="instrument-strip__group">
        <select
          id="tuning-select"
          value={currentTuning.id}
          onChange={e => {
            const t = TUNINGS.find(t => t.id === e.target.value);
            if (t) onTuningChange(t);
          }}
          className="instrument-strip__select instrument-strip__select--compact"
          aria-label="Tuning"
        >
          {TUNINGS.map(tuning => (
            <option key={tuning.id} value={tuning.id}>{tuning.name}</option>
          ))}
        </select>
      </div>

      <div className="instrument-strip__sep" />

      {/* Capo — single dropdown, "Off" disables */}
      <div className="instrument-strip__group">
        <select
          value={capoSettings.enabled ? capoSettings.fret : 0}
          onChange={e => {
            const fret = parseInt(e.target.value);
            onCapoChange({ fret, enabled: fret > 0 });
          }}
          className="instrument-strip__select instrument-strip__select--compact"
          aria-label="Capo"
        >
          <option value={0}>No capo</option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map(fret => (
            <option key={fret} value={fret}>Capo {fret}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
