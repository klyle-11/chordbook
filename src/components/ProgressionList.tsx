import { type Chord } from "../types/chord";

interface ProgressionListProps {
    progression: Chord[];
    onRemove: (index: number) => void;
    onReplace: (index: number) => void;
}

export default function ProgressionList({ progression, onRemove, onReplace}: ProgressionListProps) {
    return(
        <div className="mt-8">
            <h2 className="text-xl mb-2 text-gray-800">Chord Progression</h2>
            <ul className="space-y-2">
                {progression.map((chord, index) => (
                    <li key={index} className="flex justify-between items-center bg-white border border-gray-200 p-3 rounded shadow-sm">
                        <span className="font-medium text-gray-800">{chord.name}</span>
                        <div className="flex space-x-2">
                            <button 
                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                                onClick={() => onReplace(index)}
                            >
                                Replace
                            </button>
                            <button 
                                className="w-6 h-6 bg-red-600 hover:bg-red-700 text-white text-sm rounded flex items-center justify-center transition-colors"
                                onClick={() => onRemove(index)}
                                title="Remove chord"
                            >
                                ×
                            </button>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}