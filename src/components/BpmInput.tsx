import { useState, useEffect } from 'react';

interface BpmInputProps {
  bpm: number;
  onChange: (bpm: number) => void;
  label?: string;
  className?: string;
  size?: 'sm' | 'md';
}

export function BpmInput({ bpm, onChange, label = 'BPM:', className = '', size = 'md' }: BpmInputProps) {
  const [inputValue, setInputValue] = useState(bpm.toString());
  const [validationTimer, setValidationTimer] = useState<NodeJS.Timeout | null>(null);

  // Sync with external BPM changes
  useEffect(() => {
    setInputValue(bpm.toString());
  }, [bpm]);

  const validateAndSetBpm = (value: string) => {
    if (value === '') {
      onChange(120);
      setInputValue('120');
      return;
    }
    
    const newBpm = parseInt(value, 10);
    if (!isNaN(newBpm)) {
      // Clamp the value between 40 and 300
      const clampedBpm = Math.max(40, Math.min(300, newBpm));
      onChange(clampedBpm);
      setInputValue(clampedBpm.toString());
    } else {
      // Reset to current BPM if invalid
      setInputValue(bpm.toString());
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    // Clear existing timer
    if (validationTimer) {
      clearTimeout(validationTimer);
    }
    
    // Set a timer to validate after 1.5 seconds of no typing
    const timer = setTimeout(() => {
      validateAndSetBpm(value);
    }, 1500);
    
    setValidationTimer(timer);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Clear the timer since we're validating on blur
    if (validationTimer) {
      clearTimeout(validationTimer);
      setValidationTimer(null);
    }
    
    // Validate immediately when user clicks away
    validateAndSetBpm(e.target.value);
  };

  const inputSize = size === 'sm' ? 'text-xs px-2 py-1 w-14' : 'text-sm px-2 py-1 w-16';
  const labelSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <label className={`font-medium text-gray-700 ${labelSize}`}>
        {label}
      </label>
      <input
        type="number"
        min="40"
        max="300"
        value={inputValue}
        onChange={handleChange}
        onBlur={handleBlur}
        className={`border border-gray-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${inputSize}`}
        title="Set BPM (40-300)"
      />
    </div>
  );
}
