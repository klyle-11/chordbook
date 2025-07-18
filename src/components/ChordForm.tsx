import { useState } from 'react';

interface ChordFormProps {
    onAddChord: (chordName: string) => void;
}

export default function ChordForm({ onAddChord }: ChordFormProps) {
    const [input, setInput] = useState("");

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (input.trim()) {
            onAddChord(input.trim());
            setInput("");
        }
    }

    return (
        <form onSubmit={handleSubmit} className="flex space-x-2">
            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Enter chord name (e.g., C6)"
                className="p-2 border border-gray-300 rounded text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
                Add Chord
            </button>
        </form>
    );
}