import { TUNINGS, type Tuning } from '../lib/tunings';

interface TuningSelectorProps {
  currentTuning: Tuning;
  onTuningChange: (tuning: Tuning) => void;
}

export default function TuningSelector({ currentTuning, onTuningChange }: TuningSelectorProps) {
  const handleTuningChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedTuning = TUNINGS.find(tuning => tuning.id === event.target.value);
    if (selectedTuning) {
      onTuningChange(selectedTuning);
    }
  };

  return (
    <div className="flex items-center gap-3 bg-white rounded-lg px-4 py-2 shadow-sm border border-gray-200">
      <label htmlFor="tuning-select" className="text-sm font-medium text-gray-700 whitespace-nowrap">
        Guitar Tuning:
      </label>
      <select
        id="tuning-select"
        value={currentTuning.id}
        onChange={handleTuningChange}
        className="flex-1 min-w-[200px] px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
      >
        {TUNINGS.map((tuning) => (
          <option key={tuning.id} value={tuning.id}>
            {tuning.name}
          </option>
        ))}
      </select>
    </div>
  );
}
