import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Chord } from '../types/chord';
import type { Tuning } from '../lib/tunings';
import { isCustomChord } from '../lib/customChordLibrary';
import { TraditionalChordDiagram } from './TraditionalChordDiagram';

interface SortableDiagramProps {
  chord: Chord;
  index: number;
  tuning: Tuning;
  showAllDiagrams: boolean;
}

function SortableDiagram({ chord, index, tuning, showAllDiagrams }: SortableDiagramProps) {
  const diagramId = `diagram-${chord.name}-${index}`;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: diagramId });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 1000 : 1,
    transitionDelay: showAllDiagrams ? `${index * 50}ms` : '0ms'
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`transform transition-all duration-300 ease-out cursor-grab active:cursor-grabbing ${
        showAllDiagrams 
          ? 'translate-y-0 opacity-100 scale-100' 
          : 'translate-y-4 opacity-0 scale-95'
      } ${isDragging ? 'shadow-lg scale-105' : ''}`}
      {...attributes}
      {...listeners}
    >
      <TraditionalChordDiagram 
        chordName={chord.name} 
        tuning={tuning} 
      />
    </div>
  );
}

interface SortableChordIconProps {
  chord: Chord;
  index: number;
  tuning: Tuning;
  hoveredChord: string | null;
  showAllDiagrams: boolean;
  onHover: (chordKey: string | null) => void;
  onClick: () => void;
}

function SortableChordIcon({ 
  chord, 
  index, 
  tuning, 
  hoveredChord, 
  showAllDiagrams, 
  onHover, 
  onClick 
}: SortableChordIconProps) {
  const chordKey = `${chord.name}-${index}`;
  const isCustom = isCustomChord(chord.name);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: chordKey });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 1000 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <span
        {...attributes}
        {...listeners}
        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200 cursor-grab active:cursor-grabbing hover:bg-blue-200 transition-all duration-200 hover:scale-105 transform active:scale-95 ${
          isDragging ? 'shadow-lg bg-blue-200 scale-105' : ''
        }`}
        onMouseEnter={() => !isCustom && !showAllDiagrams && onHover(chordKey)}
        onMouseLeave={() => onHover(null)}
        onClick={onClick}
      >
        {chord.name}
        <span className="ml-1 text-blue-600 text-xs opacity-60">⋮⋮</span>
      </span>
      
      {/* Traditional chord diagram flyout (only show on hover if not showing all diagrams) */}
      {!isCustom && !showAllDiagrams && hoveredChord === chordKey && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50 animate-fade-in pointer-events-none">
          <TraditionalChordDiagram chordName={chord.name} tuning={tuning} />
        </div>
      )}
    </div>
  );
}

interface SortableChordIconsProps {
  chords: Chord[];
  tuning: Tuning;
  className?: string;
  onReorder?: (oldIndex: number, newIndex: number) => void;
}

export function SortableChordIcons({ 
  chords, 
  tuning, 
  className = "", 
  onReorder 
}: SortableChordIconsProps) {
  const [hoveredChord, setHoveredChord] = useState<string | null>(null);
  const [showAllDiagrams, setShowAllDiagrams] = useState<boolean>(false);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id && onReorder) {
      // Extract index from the id format "chordName-index"
      const activeIndex = parseInt(active.id.toString().split('-').pop() || '0');
      const overIndex = parseInt(over.id.toString().split('-').pop() || '0');
      
      onReorder(activeIndex, overIndex);
    }
  };

  if (chords.length === 0) {
    return null;
  }

  // Get unique traditional chords (non-custom) for the all diagrams display
  const traditionalChords = chords.filter(chord => !isCustomChord(chord.name));
  const uniqueTraditionalChords = traditionalChords.filter((chord, index, arr) => 
    arr.findIndex(c => c.name === chord.name) === index
  );

  const handleChordClick = () => {
    if (isAnimating) return; // Prevent multiple clicks during animation
    
    setIsAnimating(true);
    setShowAllDiagrams(!showAllDiagrams);
    setHoveredChord(null); // Clear hover state when clicking
    
    // Reset animation state after transition completes
    setTimeout(() => {
      setIsAnimating(false);
    }, 300); // Match the CSS transition duration
  };

  const items = chords.map((chord, index) => `${chord.name}-${index}`);

  return (
    <div className={`${className}`}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={items} strategy={horizontalListSortingStrategy}>
          <div className="flex items-center gap-2 flex-wrap">
            {chords.map((chord, index) => (
              <SortableChordIcon
                key={`${chord.name}-${index}`}
                chord={chord}
                index={index}
                tuning={tuning}
                hoveredChord={hoveredChord}
                showAllDiagrams={showAllDiagrams}
                onHover={setHoveredChord}
                onClick={handleChordClick}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      
      {/* All chord diagrams display with smooth animation */}
      <div 
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          showAllDiagrams ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        {uniqueTraditionalChords.length > 0 && (
          <div className={`mt-4 p-4 bg-gray-50 rounded-lg border transform transition-all duration-300 ease-out ${
            showAllDiagrams ? 'translate-y-0 scale-100 animate-bounce-in' : 'translate-y-4 scale-95'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-800">Chord Diagrams</h3>
              <button
                onClick={() => setShowAllDiagrams(false)}
                className="text-gray-500 hover:text-gray-700 text-sm transition-colors duration-200 hover:scale-110 transform"
              >
                ✕ Close
              </button>
            </div>
            <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 transition-all duration-300 ${
              showAllDiagrams ? 'opacity-100' : 'opacity-0'
            }`}>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(event) => {
                  const { active, over } = event;
                  if (over && active.id !== over.id && onReorder) {
                    // For diagram reordering, we need to find the actual chord indices
                    const activeChordName = active.id.toString().replace('diagram-', '').split('-')[0];
                    const overChordName = over.id.toString().replace('diagram-', '').split('-')[0];
                    
                    const activeIndex = chords.findIndex(chord => chord.name === activeChordName);
                    const overIndex = chords.findIndex(chord => chord.name === overChordName);
                    
                    if (activeIndex !== -1 && overIndex !== -1) {
                      onReorder(activeIndex, overIndex);
                    }
                  }
                }}
              >
                <SortableContext 
                  items={uniqueTraditionalChords.map((chord, index) => `diagram-${chord.name}-${index}`)} 
                  strategy={horizontalListSortingStrategy}
                >
                  {uniqueTraditionalChords.map((chord, index) => (
                    <SortableDiagram
                      key={`diagram-${chord.name}-${index}`}
                      chord={chord}
                      index={index}
                      tuning={tuning}
                      showAllDiagrams={showAllDiagrams}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
