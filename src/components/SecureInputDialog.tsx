import { useState, useEffect, useRef } from 'react';

interface SecureInputDialogProps {
  isOpen: boolean;
  title: string;
  placeholder?: string;
  initialValue?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
  maxLength?: number;
  validator?: (value: string) => string | null; // Returns error message or null if valid
}

export function SecureInputDialog({
  isOpen,
  title,
  placeholder = '',
  initialValue = '',
  onConfirm,
  onCancel,
  maxLength = 100,
  validator
}: SecureInputDialogProps) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setValue(initialValue);
      setError(null);
      // Focus input when dialog opens
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, initialValue]);

  const sanitizeInput = (input: string): string => {
    // Remove potentially dangerous characters and trim whitespace
    return input
      .replace(/[<>"'&]/g, '') // Remove HTML/XML special characters
      .replace(/\p{Cc}/gu, '') // Remove control characters (Unicode category)
      .trim();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const sanitizedValue = sanitizeInput(value);
    
    // Validate input length
    if (sanitizedValue.length === 0) {
      setError('This field is required');
      return;
    }
    
    if (sanitizedValue.length > maxLength) {
      setError(`Maximum length is ${maxLength} characters`);
      return;
    }
    
    // Run custom validator if provided
    if (validator) {
      const validationError = validator(sanitizedValue);
      if (validationError) {
        setError(validationError);
        return;
      }
    }
    
    onConfirm(sanitizedValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              maxLength={maxLength}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                error ? 'border-red-500' : 'border-gray-300'
              }`}
              autoComplete="off"
              spellCheck={false}
            />
            {error && (
              <p className="text-red-500 text-sm mt-2">{error}</p>
            )}
            <p className="text-gray-500 text-xs mt-1">
              {value.length}/{maxLength} characters
            </p>
          </div>
          
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
