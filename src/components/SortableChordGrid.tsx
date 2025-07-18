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
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import type { Chord } from '../types/chord';
import DraggableChordCard from './DraggableChordCard';

interface SortableChordGridProps {
  progression: Chord[];
  onReorder: (oldIndex: number, newIndex: number) => void;
  onReplace: (index: number) => void;
  onRemove: (index: number) => void;
}

export default function SortableChordGrid({
  progression,
  onReorder,
  onReplace,
  onRemove,
}: SortableChordGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = progression.findIndex((_, index) => `chord-${index}` === active.id);
      const newIndex = progression.findIndex((_, index) => `chord-${index}` === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        onReorder(oldIndex, newIndex);
      }
    }
  };

  const items = progression.map((_, index) => `chord-${index}`);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items} strategy={rectSortingStrategy}>
        <div className="flex flex-col gap-6">
          {progression.map((chord, index) => (
            <DraggableChordCard
              key={`chord-${index}`}
              chord={chord}
              index={index}
              onReplace={onReplace}
              onRemove={onRemove}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
