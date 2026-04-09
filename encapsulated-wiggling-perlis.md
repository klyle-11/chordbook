# Harmonic Analysis Feature Plan

## Context

Add a toggleable harmonic analysis engine that uses the circle of fifths to provide harmonic context for chord progressions. When enabled, it detects the key center, labels each chord's function (tonic/subdominant/dominant + Roman numeral), suggests extensions and substitutions, classifies notes by tension level, and shows a circle-of-fifths visualization. Works on single progressions, paired progressions, and progressions with active leads.

The app already depends on `@tonaljs/tonal` v4.10.0 but only uses `Chord.get()`. The library provides everything needed:
- `Key.majorKey(tonic)` / `Key.minorKey(tonic)` — chords, grades, harmonic functions
- `Scale.detect(notes)` — key detection from note collection
- `Progression.toRomanNumerals(key, chords)` — Roman numeral analysis
- `Chord.get(name)` — chord notes, intervals, quality
- `Note.transpose()`, `Note.enharmonic()` — note manipulation

## Analysis Engine — `src/lib/harmonicAnalysis.ts` (new)

### Data structures

```typescript
interface HarmonicContext {
  detectedKey: string;              // e.g. "C major", "A minor"
  keyTonic: string;                 // e.g. "C", "A"
  keyType: 'major' | 'minor';
  scale: string[];                  // e.g. ["C","D","E","F","G","A","B"]
  diatonicChords: string[];         // e.g. ["Cmaj7","Dm7","Em7",...]
  chordsHarmonicFunction: string[]; // e.g. ["T","SD","T","SD","D","T","D"]
  grades: string[];                 // e.g. ["I","II","III","IV","V","VI","VII"]
  alternateKeys?: string[];         // other possible keys
}

interface ChordAnalysis {
  chordName: string;
  romanNumeral: string;             // e.g. "IIm7", "V7", "Imaj7"
  harmonicFunction: string;         // "Tonic" | "Subdominant" | "Dominant" | "Secondary" | "Borrowed"
  functionAbbrev: string;           // "T" | "SD" | "D"
  scaleDegree: number;              // 1-7
  isDiatonic: boolean;              // whether chord belongs to detected key

  coreTones: NoteClassification[];  // root, 3rd, 5th, 7th
  colorTones: NoteClassification[]; // available 9, 11, 13
  contextNotes: NoteClassification[]; // other scale notes

  extensions: string[];             // e.g. ["Dm9", "Dm11", "Dm13"]
  susVariants: string[];            // e.g. ["Dsus4", "Dsus2"]
  substitutions: string[];          // e.g. ["Fmaj7", "Bm7b5"] (related chords)
  alteredOptions: string[];         // for dominant chords: b9, #9, #11, b13

  fifthNeighbors: {                 // circle of fifths context
    clockwise: string;              // fifth above (e.g. "A" for D)
    counterclockwise: string;       // fifth below (e.g. "G" for D)
  };
}

interface NoteClassification {
  note: string;
  role: 'root' | '3rd' | '5th' | '7th' | '9th' | '11th' | '13th' | 'scale' | 'chromatic';
  tension: 'stable' | 'color' | 'tense' | 'leading';
}

interface ProgressionAnalysis {
  context: HarmonicContext;
  chords: ChordAnalysis[];
}
```

### Key detection algorithm

```
detectKey(chords: Chord[]):
  1. Collect all unique notes from all chords
  2. Use Scale.detect(notes) to get candidate scales
  3. Apply heuristics to rank candidates:
     - First chord root bias (common to start on I or vi)
     - Last chord root bias (common to resolve to I)
     - Frequency of chord roots matching scale degrees I, IV, V
     - Prefer major/minor over exotic modes
  4. Return top candidate as detected key
```

### Per-chord analysis algorithm

```
analyzeChord(chordName, harmonicContext):
  1. Roman numeral: Progression.toRomanNumerals(keyTonic, [chordName])
  2. Function: match chord root against diatonicChords → get corresponding function
     - If not diatonic, check for secondary dominants, borrowed chords
  3. Core tones: Chord.get(chordName).notes → classify as root/3rd/5th/7th
  4. Color tones: try extensions (add 9/11/13), filter to notes in scale
  5. Context notes: remaining scale notes not in chord
  6. Tension: root/5th = stable, 3rd/7th = color, 4th/b9/#9 = tense, 7th on V = leading
  7. Extensions: try Chord.get(root + "9"), "11", "13", filter valid ones
  8. Sus: try root + "sus4", "sus2"
  9. Substitutions: relative major/minor, tritone sub for dominants, fifth neighbors
  10. Fifth neighbors: Note.transpose(root, "5P") and Note.transpose(root, "-5P")
```

### Key functions to export

- `analyzeProgression(chords: Chord[]): ProgressionAnalysis`
- `detectKey(chords: Chord[]): HarmonicContext`
- `analyzeChord(chordName: string, context: HarmonicContext): ChordAnalysis`
- `getCircleOfFifths(): string[]` — static ordered array of all 12 keys
- `classifyLeadNote(note: string, chordAnalysis: ChordAnalysis, context: HarmonicContext): NoteClassification`

## Theme Colors — `src/lib/theme.ts`

Add `analysis` and `analysisSubtle` to `Theme.colors`:

| Theme    | `analysis`         | `analysisSubtle`            |
|----------|--------------------|-----------------------------|
| Warm     | `#d97706` (amber)  | `rgba(217,119,6,0.12)`      |
| Dark     | `#facc15` (yellow) | `rgba(250,204,21,0.12)`     |
| Ocean    | `#f0abfc` (pink)   | `rgba(240,171,252,0.12)`    |
| Forest   | `#fbbf24` (amber)  | `rgba(251,191,36,0.12)`     |
| Midnight | `#c084fc` (purple) | `rgba(192,132,252,0.12)`    |

These become `--analysis` and `--analysis-subtle` CSS variables.

## New Components

### 1. `HarmonicAnalysisPanel.tsx` — Main analysis panel

A collapsible card that replaces/augments the existing `SongScale` section. Shows:

- **Key badge**: Detected key with confidence indicator, e.g. "C Major" or "A Minor"
- **Alternate keys**: Small text showing other possibilities
- **Scale notes**: Note pills colored by function
- **Circle of fifths mini-view**: SVG circle with 12 key positions
  - Current key highlighted with `var(--analysis)` 
  - Diatonic chords highlighted with `var(--analysis-subtle)`
  - Active chord (if any) gets a ring indicator
  - Fifth neighbors connected with lines
- **Progression movement**: Shows the harmonic movement as arrows (e.g., ii → V → I)

**Circle of fifths SVG approach**: 12 circles arranged in a ring (simple trigonometry: `cx = center + r * cos(angle)`, `cy = center + r * sin(angle)`). Order: C, G, D, A, E, B, F#/Gb, Db, Ab, Eb, Bb, F. Each circle shows the key letter. Highlighted states via fill color.

**Props:**
```typescript
interface HarmonicAnalysisPanelProps {
  analysis: ProgressionAnalysis | null;
  activeChordIndex?: number;  // which chord is "focused" for circle highlight
  activeLeadNotes?: string[];
}
```

### 2. `ChordAnalysisOverlay.tsx` — Per-chord analysis section

Rendered inside each `DraggableChordCard` when analysis is enabled. A compact expandable section below the chord diagram showing:

- **Header line**: Roman numeral + function badge (e.g., `ii7 · Subdominant`)
- **Expandable detail** (click to toggle):
  - **Chord tones**: notes labeled as root/3rd/5th/7th with colored dots
  - **Available extensions**: clickable pills showing 9, 11, 13, sus2, sus4
  - **Substitutions**: chord name pills the user could swap in
  - **Tension map**: if a lead is active, show each lead note classified against this chord

**Props:**
```typescript
interface ChordAnalysisOverlayProps {
  analysis: ChordAnalysis;
  context: HarmonicContext;
  activeLeadNotes?: string[];
}
```

**Compact by default** — shows just the Roman numeral and function. Expands on click to show full detail.

## State Management — `src/App.tsx`

New state:
```typescript
const [analysisEnabled, setAnalysisEnabled] = useState(false);
```

Derived (memoized):
```typescript
const progressionAnalysis = useMemo(() => {
  if (!analysisEnabled || !currentSong) return null;
  const allChords = currentSong.progressions.flatMap(p => p.chords);
  if (allChords.length === 0) return null;
  return analyzeProgression(allChords);
}, [analysisEnabled, currentSong?.progressions]);
```

Persist toggle: store `analysisEnabled` in `appState` table (like `activeLeadId`).

Pass down: `analysisEnabled`, `progressionAnalysis` as props through SongProgressions → progression items → chord cards.

## Modified Components

### `SongProgressions.tsx`
- Add `analysisEnabled`, `progressionAnalysis`, `onToggleAnalysis` props
- Add **Analysis chip** in the chips row (alongside Leads/Pairings):
  ```
  [Pairings: ...] [Leads: ...] [Analysis: ON/OFF toggle chip]
  ```
- Pass per-chord analysis to each `SortableProgressionItem` → `SortableChordGrid` → `DraggableChordCard`

### `SortableChordGrid.tsx`
- Add `chordAnalyses?: ChordAnalysis[]` and `harmonicContext?: HarmonicContext` props
- Pass corresponding `ChordAnalysis` to each `DraggableChordCard` by index

### `DraggableChordCard.tsx`
- Add `chordAnalysis?: ChordAnalysis`, `harmonicContext?: HarmonicContext` props
- When `chordAnalysis` is present, render `ChordAnalysisOverlay` below the chord diagram

### `SongScale.tsx` (or replace with HarmonicAnalysisPanel)
- When analysis is enabled, replace the basic SongScale view with the richer `HarmonicAnalysisPanel`
- When analysis is off, show the existing SongScale as-is

### `App.tsx`
- Add state + persist toggle
- Compute `progressionAnalysis` with `useMemo`
- Pass to SongProgressions and to the analysis panel (replacing SongScale section when enabled)
- Load `analysisEnabled` from `appState` in init

## Prop Drilling Path

```
App.tsx (analysisEnabled, progressionAnalysis)
  → SongScale / HarmonicAnalysisPanel (analysis panel view)
  → SongProgressions (analysis toggle chip + per-chord data)
    → SortableProgressionItem (chordAnalyses[])
      → SortableChordGrid (chordAnalyses[])
        → DraggableChordCard (chordAnalysis, harmonicContext)
          → ChordAnalysisOverlay
```

## Implementation Order

### Phase 1: Analysis engine
1. Create `src/lib/harmonicAnalysis.ts` with all pure functions
2. Key detection, chord analysis, extension/substitution generation, note classification
3. This is the core — testable independently

### Phase 2: Theme + toggle
4. Add `analysis` / `analysisSubtle` colors to all themes in `theme.ts`
5. Add CSS variable defaults to `index.css`
6. Add `analysisEnabled` state to `App.tsx` with `appState` persistence
7. Add analysis toggle chip to `SongProgressions.tsx` chips row

### Phase 3: Per-chord overlay
8. Create `ChordAnalysisOverlay.tsx`
9. Thread `chordAnalysis` + `harmonicContext` through `SortableChordGrid` → `DraggableChordCard`
10. Compute `progressionAnalysis` in `App.tsx` with `useMemo`, pass down

### Phase 4: Analysis panel + circle of fifths
11. Create `HarmonicAnalysisPanel.tsx` with circle of fifths SVG
12. Replace `SongScale` section in `App.tsx` when analysis is enabled
13. Show key detection, scale, progression movement visualization

### Phase 5: Lead integration + polish
14. Add lead note classification against harmonic context
15. Show lead note tension in `ChordAnalysisOverlay` when lead is active
16. Polish: handle edge cases (no chords, single chord, ambiguous keys)

## Key Files

**New:**
- `src/lib/harmonicAnalysis.ts` — core analysis engine
- `src/components/HarmonicAnalysisPanel.tsx` — panel with circle of fifths
- `src/components/ChordAnalysisOverlay.tsx` — per-chord analysis section

**Modified:**
- `src/lib/theme.ts` — add analysis colors
- `src/index.css` — CSS variable defaults
- `src/App.tsx` — state, memoized analysis, toggle persistence, routing to panel
- `src/components/SongProgressions.tsx` — analysis toggle chip, prop threading
- `src/components/SortableChordGrid.tsx` — pass chord analyses
- `src/components/DraggableChordCard.tsx` — render ChordAnalysisOverlay
- `src/components/SongScale.tsx` — conditional swap with HarmonicAnalysisPanel

## Verification

1. Toggle analysis on — verify key is detected correctly for a ii-V-I progression (Dm7-G7-Cmaj7 → C major)
2. Each chord card shows Roman numeral and function label
3. Expand a chord's analysis — see extensions, substitutions, note classifications
4. Circle of fifths highlights the current key and diatonic chords
5. Activate a lead — lead notes classified as chord tone/tension/passing in each chord's overlay
6. Toggle analysis off — all analysis UI disappears, no performance impact
7. Switch themes — analysis colors adapt
8. Reload — toggle state persists
