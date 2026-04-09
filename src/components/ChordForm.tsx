import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { isValidChord, getChordSuggestions, getNotesForChord, findChordByNotes } from '../lib/chordUtils';
import { parseChordInput, addCustomChord } from '../lib/customChordLibrary';

interface ChordFormProps {
    onAddChord: (chordName: string) => void;
    onReplaceChord?: (chordName: string, progressionId: string, chordIndex: number) => void;
}

export interface ChordFormRef {
  startReplaceMode: (progressionId: string, chordIndex: number, originalChord: string) => void;
  resetForm: () => void;
  scrollIntoView: (options?: ScrollIntoViewOptions) => void;
}const ChordForm = forwardRef<ChordFormRef, ChordFormProps>(({ onAddChord, onReplaceChord }, ref) => {
    const [input, setInput] = useState("");
    const [error, setError] = useState("");
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [previewNotes, setPreviewNotes] = useState<string[]>([]);
    const [replaceMode, setReplaceMode] = useState<{
        progressionId: string;
        chordIndex: number;
        originalChord: string;
    } | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const formRef = useRef<HTMLFormElement>(null);

    useImperativeHandle(ref, () => ({
        startReplaceMode: (progressionId: string, chordIndex: number, currentChordName: string) => {
            setReplaceMode({
                progressionId,
                chordIndex,
                originalChord: currentChordName
            });
            setInput(currentChordName);
            setError("");
            setSuggestions([]);
            setPreviewNotes([]);
            // Focus the input field
            setTimeout(() => {
                inputRef.current?.focus();
                inputRef.current?.select();
            }, 100);
        },
        resetForm: () => {
            setInput("");
            setError("");
            setSuggestions([]);
            setPreviewNotes([]);
            setReplaceMode(null);
        },
        scrollIntoView: (options?: ScrollIntoViewOptions) => {
            if (formRef.current) {
                formRef.current.scrollIntoView(options);
            }
        }
    }));

    // Debounced effect to show chord preview after 1 second of no typing
    useEffect(() => {
        const timer = setTimeout(() => {
            const trimmedInput = input.trim();
            if (trimmedInput) {
                // Check if it's a custom chord input format
                const { isCustomChord, notes } = parseChordInput(trimmedInput);
                if (isCustomChord) {
                    // Check if these notes match an existing chord
                    const existingChord = findChordByNotes(notes);
                    if (existingChord) {
                        // Show preview as the existing chord
                        const existingNotes = getNotesForChord(existingChord);
                        setPreviewNotes([`Found: ${existingChord} (${existingNotes.join(", ")})`]);
                    } else {
                        // Show as custom chord
                        setPreviewNotes(notes);
                    }
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
            // First check if these notes match an existing chord in the library
            const existingChord = findChordByNotes(notes);
            
            if (existingChord) {
                // Use the existing chord
                if (replaceMode && onReplaceChord) {
                    onReplaceChord(existingChord, replaceMode.progressionId, replaceMode.chordIndex);
                } else {
                    onAddChord(existingChord);
                }
                resetForm();
            } else {
                // Try to add as custom chord since no existing chord matches
                const success = addCustomChord(trimmedInput, notes);
                if (success) {
                    if (replaceMode && onReplaceChord) {
                        onReplaceChord(trimmedInput, replaceMode.progressionId, replaceMode.chordIndex);
                    } else {
                        onAddChord(trimmedInput);
                    }
                    resetForm();
                } else {
                    setError(`A chord with notes "${notes.join(", ")}" already exists in your library.`);
                    setSuggestions([]);
                    setPreviewNotes([]);
                }
            }
        } else if (isValidChord(trimmedInput)) {
            if (replaceMode && onReplaceChord) {
                onReplaceChord(trimmedInput, replaceMode.progressionId, replaceMode.chordIndex);
            } else {
                onAddChord(trimmedInput);
            }
            resetForm();
        } else {
            const chordSuggestions = getChordSuggestions(trimmedInput);
            setError(`"${trimmedInput}" is not in the library yet.`);
            setSuggestions(chordSuggestions);
            setPreviewNotes([]);
        }
    }

    function resetForm() {
        setInput("");
        setError("");
        setSuggestions([]);
        setPreviewNotes([]);
        setReplaceMode(null);
    }

    function cancelReplace() {
        resetForm();
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

    // Check if current input is a custom chord format and if it matches existing chord
    const { isCustomChord, notes } = parseChordInput(input.trim());
    const existingChord = isCustomChord ? findChordByNotes(notes) : null;
    
    
    const getButtonText = () => {
        if (replaceMode) {
            if (isCustomChord && existingChord) {
                return `Replace with ${existingChord}`;
            } else if (isCustomChord) {
                return "Replace with Custom";
            } else {
                return "Replace Chord";
            }
        } else {
            if (isCustomChord && existingChord) {
                return `Add ${existingChord}`;
            } else if (isCustomChord) {
                return "Add Custom";
            } else {
                return "Add Chord";
            }
        }
    };

    return (
        <div className="mb-2">
            {replaceMode && (
                <div className="mb-2 px-3 py-2 rounded-lg" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--accent)' }}>
                    <div className="flex items-center justify-between">
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            <span className="font-medium" style={{ color: 'var(--accent)' }}>Replace:</span> "{replaceMode.originalChord}" at position {replaceMode.chordIndex + 1}
                        </p>
                        <button
                            onClick={cancelReplace}
                            className="text-xs underline transition-colors"
                            style={{ color: 'var(--text-muted)' }}
                            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
                            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            <form ref={formRef} onSubmit={handleSubmit} className="flex items-center gap-2">
                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onClick={handleClick}
                    placeholder={replaceMode ? `Replace "${replaceMode.originalChord}" with...` : "Chord name or [C, E, G]"}
                    className="flex-1 px-3 py-1.5 text-sm rounded-lg transition-colors"
                    style={{
                      background: 'var(--bg-secondary)',
                      color: 'var(--text)',
                      border: '1px solid var(--border)',
                      outline: 'none',
                    }}
                    onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                />
                <button
                    type="submit"
                    className="text-sm font-medium transition-colors"
                    style={{
                      color: 'var(--accent)',
                      background: 'none',
                      border: 'none',
                      borderBottom: '1.5px solid var(--accent)',
                      padding: '2px 0',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'var(--accent)';
                      e.currentTarget.style.color = '#fff';
                      e.currentTarget.style.padding = '2px 8px';
                      e.currentTarget.style.borderRadius = '4px';
                      e.currentTarget.style.borderBottom = '1.5px solid transparent';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'none';
                      e.currentTarget.style.color = 'var(--accent)';
                      e.currentTarget.style.padding = '2px 0';
                      e.currentTarget.style.borderRadius = '0';
                      e.currentTarget.style.borderBottom = '1.5px solid var(--accent)';
                    }}
                >
                    {getButtonText()}
                </button>
                {replaceMode && (
                    <button
                        type="button"
                        onClick={cancelReplace}
                        className="text-sm transition-colors underline"
                        style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                    >
                        Cancel
                    </button>
                )}
            </form>

            {/* Chord preview */}
            {previewNotes.length > 0 && !error && (
                <div className="mt-1.5 px-3 py-1.5 rounded-lg text-xs" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        {existingChord ? (
                            <>
                                <span style={{ color: 'var(--text)' }}>{input.trim()}</span> matches <span className="font-semibold" style={{ color: 'var(--accent)' }}>{existingChord}</span>
                            </>
                        ) : (
                            <>
                                <span style={{ color: 'var(--text)' }}>{input.trim()}</span> = {previewNotes.join(", ")}
                                {isCustomChord && <span style={{ color: 'var(--text-muted)' }}> (custom)</span>}
                            </>
                        )}
                    </p>
                </div>
            )}

            {error && (
                <div className="mt-1.5 px-3 py-1.5 rounded-lg text-xs" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--danger, #ef4444)' }}>
                    <p style={{ color: 'var(--danger, #ef4444)' }}>{error}</p>
                    {suggestions.length > 0 && (
                        <div className="mt-1.5 flex items-center gap-1.5">
                            <span style={{ color: 'var(--text-muted)' }}>Try:</span>
                            {suggestions.map((suggestion) => (
                                <button
                                    key={suggestion}
                                    onClick={() => handleSuggestionClick(suggestion)}
                                    className="px-2 py-0.5 rounded text-xs font-medium transition-colors"
                                    style={{
                                      background: 'var(--accent)',
                                      color: '#fff',
                                      border: 'none',
                                      cursor: 'pointer',
                                    }}
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {!error && !replaceMode && (
                <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                    Custom chords: [C, E, G, Bb]
                </p>
            )}
        </div>
    );
});

ChordForm.displayName = 'ChordForm';

export default ChordForm;