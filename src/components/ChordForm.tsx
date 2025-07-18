import { useState, useEffect } from 'react';
import { isValidChord, getChordSuggestions, getNotesForChord } from '../lib/chordUtils';
import { parseChordInput, addCustomChord } from '../lib/customChordLibrary';

interface ChordFormProps {
    onAddChord: (chordName: string) => void;
}

export default function ChordForm({ onAddChord }: ChordFormProps) {
    const [input, setInput] = useState("");
    const [error, setError] = useState("");
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [previewNotes, setPreviewNotes] = useState<string[]>([]);

    // Debounced effect to show chord preview after 1 second of no typing
    useEffect(() => {
        const timer = setTimeout(() => {
            const trimmedInput = input.trim();
            if (trimmedInput) {
                // Check if it's a custom chord input format
                const { isCustomChord, notes } = parseChordInput(trimmedInput);
                if (isCustomChord) {
                    setPreviewNotes(notes);
                } else if (isValidChord(trimmedInput)) {
                    const notes = getNotesForChord(trimmedInput);
                    setPreviewNotes(notes);
                } else {
                    setPreviewNotes([]);
                }
            } else {
                setPreviewNotes([]);
            }
        }, 1000);

        return () => clearTimeout(timer);
    }, [input]);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const trimmedInput = input.trim();
        
        if (!trimmedInput) {
            setError("");
            setSuggestions([]);
            setPreviewNotes([]);
            return;
        }

        // Check if it's a custom chord input format
        const { isCustomChord, notes } = parseChordInput(trimmedInput);
        
        if (isCustomChord) {
            // Try to add the custom chord
            const success = addCustomChord(trimmedInput, notes);
            if (success) {
                onAddChord(trimmedInput);
                setInput("");
                setError("");
                setSuggestions([]);
                setPreviewNotes([]);
            } else {
                setError(`A chord with notes "${notes.join(", ")}" already exists in your library.`);
                setSuggestions([]);
                setPreviewNotes([]);
            }
        } else if (isValidChord(trimmedInput)) {
            onAddChord(trimmedInput);
            setInput("");
            setError("");
            setSuggestions([]);
            setPreviewNotes([]);
        } else {
            const chordSuggestions = getChordSuggestions(trimmedInput);
            setError(`"${trimmedInput}" is not in the library yet.`);
            setSuggestions(chordSuggestions);
            setPreviewNotes([]);
        }
    }

    function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
        const newInput = e.target.value;
        setInput(newInput);
        
        // Clear error, suggestions, and preview when user starts typing
        if (error) {
            setError("");
            setSuggestions([]);
        }
        setPreviewNotes([]);
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        const target = e.target as HTMLInputElement;
        
        // Auto-close brackets
        if (e.key === '[') {
            e.preventDefault();
            const cursorPosition = target.selectionStart || 0;
            const currentValue = target.value;
            const newValue = currentValue.slice(0, cursorPosition) + '[]' + currentValue.slice(cursorPosition);
            setInput(newValue);
            
            // Position cursor between brackets
            setTimeout(() => {
                target.setSelectionRange(cursorPosition + 1, cursorPosition + 1);
            }, 0);
        }
        
        // Handle Cmd/Ctrl + A for select all
        if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
            e.preventDefault();
            target.select();
        }
        
        // Handle Cmd/Ctrl + arrow keys for word navigation
        if ((e.metaKey || e.ctrlKey) && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
            e.preventDefault();
            const value = target.value;
            const currentPos = target.selectionStart || 0;
            
            if (e.key === 'ArrowLeft') {
                // Move to start of current word or previous word
                let newPos = currentPos;
                while (newPos > 0 && /\s/.test(value[newPos - 1])) newPos--; // Skip whitespace
                while (newPos > 0 && !/\s/.test(value[newPos - 1])) newPos--; // Find word boundary
                target.setSelectionRange(newPos, newPos);
            } else {
                // Move to end of current word or next word
                let newPos = currentPos;
                while (newPos < value.length && !/\s/.test(value[newPos])) newPos++; // Skip current word
                while (newPos < value.length && /\s/.test(value[newPos])) newPos++; // Skip whitespace
                target.setSelectionRange(newPos, newPos);
            }
        }
    }

    function handleClick(e: React.MouseEvent<HTMLInputElement>) {
        // Support triple-click to select all
        if (e.detail === 3) {
            const target = e.target as HTMLInputElement;
            target.select();
        }
    }

    function handleSuggestionClick(suggestion: string) {
        setInput(suggestion);
        setError("");
        setSuggestions([]);
        setPreviewNotes([]);
    }

    // Check if current input is a custom chord format
    const { isCustomChord } = parseChordInput(input.trim());

    return (
        <div className="mb-4">
            <form onSubmit={handleSubmit} className="flex space-x-2">
                <input
                    type="text"
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onClick={handleClick}
                    placeholder="Enter chord name (e.g., C6) or custom chord [C, E, G]"
                    className="p-2 border border-gray-300 rounded text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {isCustomChord ? "Add Custom" : "Add Chord"}
                </button>
            </form>
            
            {/* Chord preview */}
            {previewNotes.length > 0 && !error && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                    <p className="text-green-700 text-sm">
                        <span className="font-medium">{input.trim()}</span> contains: {previewNotes.join(", ")}
                        {isCustomChord && <span className="italic text-green-600"> (custom chord)</span>}
                    </p>
                </div>
            )}
            
            {error && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                    <p className="text-red-700 text-sm">{error}</p>
                    {suggestions.length > 0 && (
                        <div className="mt-2">
                            <p className="text-red-600 text-xs mb-1">Did you mean:</p>
                            <div className="flex gap-2">
                                {suggestions.map((suggestion) => (
                                    <button
                                        key={suggestion}
                                        onClick={() => handleSuggestionClick(suggestion)}
                                        className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200 transition-colors"
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
            
            {/* Help text for custom chords */}
            {!error && (
                <div className="mt-1">
                    <p className="text-xs text-gray-500">
                        Tip: Create custom chords by typing notes in brackets, e.g., [C, E, G, B♭]
                    </p>
                </div>
            )}
        </div>
    );
}