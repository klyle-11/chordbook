import { useEffect, useState } from 'react';
import { TUNINGS, getCapoFret, type Tuning, type CapoSettings } from '../lib/music/tunings';

interface TuningSelectorProps {
  currentTuning: Tuning;
  onTuningChange: (tuning: Tuning) => void;
  capoSettings: CapoSettings;
  onCapoChange: (settings: CapoSettings) => void;
  /** Chords with a saved tab in this song — they'll be re-pitched by a capo change */
  voicedChordCount?: number;
}

export default function TuningSelector({ currentTuning, onTuningChange, capoSettings, onCapoChange, voicedChordCount = 0 }: TuningSelectorProps) {
  // Tab is capo-relative: moving the capo keeps every shape and moves its pitch. Say so.
  const [capoNotice, setCapoNotice] = useState<string | null>(null);
  useEffect(() => {
    if (!capoNotice) return;
    const timer = setTimeout(() => setCapoNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [capoNotice]);

  function changeCapo(fret: number) {
    const delta = fret - getCapoFret(capoSettings);
    onCapoChange({ fret, enabled: fret > 0 });
    if (delta !== 0 && voicedChordCount > 0) {
      const steps = Math.abs(delta);
      setCapoNotice(
        `Tabs keep their shapes — ${voicedChordCount} voiced chord${voicedChordCount !== 1 ? 's' : ''} now sound${voicedChordCount === 1 ? 's' : ''} ` +
        `${steps} semitone${steps !== 1 ? 's' : ''} ${delta > 0 ? 'higher' : 'lower'}`
      );
    }
  }

  return (
    <div className="instrument-strip" style={{ position: 'relative' }}>
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
          onChange={e => changeCapo(parseInt(e.target.value, 10))}
          className="instrument-strip__select instrument-strip__select--compact"
          aria-label="Capo"
        >
          <option value={0}>No capo</option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map(fret => (
            <option key={fret} value={fret}>Capo {fret}</option>
          ))}
        </select>
      </div>

      {capoNotice && (
        <div className="capo-notice" role="status" onClick={() => setCapoNotice(null)}>
          {capoNotice}
        </div>
      )}
    </div>
  );
}
