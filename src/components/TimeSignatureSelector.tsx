import { useState, useRef, useEffect } from 'react';
import type { TimeSignature } from '../types/song';

interface TimeSignatureSelectorProps {
  timeSignature: TimeSignature;
  onChange: (ts: TimeSignature) => void;
  disabled?: boolean;
}

const PRESETS: TimeSignature[] = [
  { beatsPerMeasure: 2, beatUnit: 4 },
  { beatsPerMeasure: 3, beatUnit: 4 },
  { beatsPerMeasure: 4, beatUnit: 4 },
  { beatsPerMeasure: 5, beatUnit: 4 },
  { beatsPerMeasure: 6, beatUnit: 8 },
  { beatsPerMeasure: 7, beatUnit: 8 },
];

export function TimeSignatureSelector({ timeSignature, onChange, disabled }: TimeSignatureSelectorProps) {
  const [showFlyout, setShowFlyout] = useState(false);
  const [customBeats, setCustomBeats] = useState(String(timeSignature.beatsPerMeasure));
  const [customUnit, setCustomUnit] = useState(String(timeSignature.beatUnit));
  const flyoutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCustomBeats(String(timeSignature.beatsPerMeasure));
    setCustomUnit(String(timeSignature.beatUnit));
  }, [timeSignature]);

  const isMatch = (ts: TimeSignature) =>
    ts.beatsPerMeasure === timeSignature.beatsPerMeasure && ts.beatUnit === timeSignature.beatUnit;

  const handlePreset = (ts: TimeSignature) => {
    onChange(ts);
    setShowFlyout(false);
  };

  const handleCustomApply = () => {
    const beats = parseInt(customBeats, 10);
    const unit = parseInt(customUnit, 10);
    if (beats >= 1 && beats <= 16 && [2, 4, 8, 16].includes(unit)) {
      onChange({ beatsPerMeasure: beats, beatUnit: unit });
      setShowFlyout(false);
    }
  };

  return (
    <div className="playback-strip__group" style={{ position: 'relative' }}>
      <span className="playback-strip__label">Time</span>
      <button
        className="time-sig-selector__btn"
        onClick={() => !disabled && setShowFlyout(!showFlyout)}
        disabled={disabled}
        aria-label="Change time signature"
      >
        {timeSignature.beatsPerMeasure}/{timeSignature.beatUnit}
      </button>

      {showFlyout && (
        <>
          <div className="playback-strip__flyout-backdrop" onClick={() => setShowFlyout(false)} />
          <div className="time-sig-selector__flyout" ref={flyoutRef}>
            <div className="time-sig-selector__presets">
              {PRESETS.map(ts => (
                <button
                  key={`${ts.beatsPerMeasure}/${ts.beatUnit}`}
                  className="time-sig-selector__preset"
                  data-active={isMatch(ts)}
                  onClick={() => handlePreset(ts)}
                >
                  {ts.beatsPerMeasure}/{ts.beatUnit}
                </button>
              ))}
            </div>
            <div className="time-sig-selector__custom">
              <span className="playback-strip__label">Custom</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input
                  type="number"
                  min="1"
                  max="16"
                  value={customBeats}
                  onChange={e => setCustomBeats(e.target.value)}
                  className="time-sig-selector__input"
                />
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>/</span>
                <select
                  value={customUnit}
                  onChange={e => setCustomUnit(e.target.value)}
                  className="time-sig-selector__input"
                  style={{ width: 40 }}
                >
                  <option value="2">2</option>
                  <option value="4">4</option>
                  <option value="8">8</option>
                  <option value="16">16</option>
                </select>
                <button className="themed-btn-primary" style={{ padding: '2px 8px', fontSize: '0.7rem' }} onClick={handleCustomApply}>
                  Set
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
