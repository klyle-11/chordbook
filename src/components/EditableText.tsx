import React, { useState, useRef, useEffect } from 'react';

interface EditableTextProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function EditableText({ 
  value, 
  onChange, 
  placeholder = "Click to edit...",
  className = ""
}: EditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleClick = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    onChange(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const handleBlur = () => {
    handleSave();
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className={`min-w-[300px] max-w-[500px] px-3 py-2 bg-transparent border border-blue-500 rounded text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 ${className || 'text-lg'}`}
        placeholder={placeholder}
      />
    );
  }

  return (
    <div
      onClick={handleClick}
      className={`min-w-[300px] max-w-[500px] px-3 py-2 bg-transparent border border-transparent rounded text-gray-900 cursor-pointer hover:bg-gray-100/50 transition-colors min-h-[42px] flex items-center ${className || 'text-lg'}`}
    >
      {value || (
        <span className={`text-gray-400 italic ${className || 'text-lg'}`}>{placeholder}</span>
      )}
    </div>
  );
}
