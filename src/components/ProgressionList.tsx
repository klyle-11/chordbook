import { type Chord } from "../types/chord";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ProgressionListProps {
    progression: Chord[];
    onRemove: (index: number) => void;
    onReplace: (index: number) => void;
    onReorder: (oldIndex: number, newIndex: number) => void;
}

interface SortableChordItemProps {
  chord: Chord;
  index: number;
  onRemove: (index: number) => void;
  onReplace: (index: number) => void;
}

function SortableChordItem({ chord, index, onRemove, onReplace }: SortableChordItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `chord-list-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li 
      ref={setNodeRef}
      style={style}
      className="flex justify-between items-center bg-white border border-gray-200 p-3 rounded shadow-sm"
    >
      <div className="flex items-center flex-1 mr-4">
        <div 
          className="cursor-grab active:cursor-grabbing mr-3 text-gray-400 hover:text-gray-600"
          {...attributes}
          {...listeners}
        >
          ⋮⋮
        </div>
        <span className="font-medium text-gray-800 truncate">{chord.name}</span>
      </div>
      <div className="flex space-x-2 flex-shrink-0">
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
  );
}

export default function ProgressionList({ progression, onRemove, onReplace, onReorder}: ProgressionListProps) {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = progression.findIndex((_, index) => `chord-list-${index}` === active.id);
            const newIndex = progression.findIndex((_, index) => `chord-list-${index}` === over.id);
            
            if (oldIndex !== -1 && newIndex !== -1) {
                onReorder(oldIndex, newIndex);
            }
        }
    };

    const items = progression.map((_, index) => `chord-list-${index}`);

    return(
        <div className="mt-8 max-w-[50%]">
            <h2 className="text-xl mb-2 text-gray-800">Chord Progression</h2>
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext items={items} strategy={verticalListSortingStrategy}>
                    <ul className="space-y-2">
                        {progression.map((chord, index) => (
                            <SortableChordItem
                                key={`chord-list-${index}`}
                                chord={chord}
                                index={index}
                                onRemove={onRemove}
                                onReplace={onReplace}
                            />
                        ))}
                    </ul>
                </SortableContext>
            </DndContext>
        </div>
    );
}