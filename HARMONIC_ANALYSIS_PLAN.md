# Harmonic Analysis Feature — Full Plan with Context

## Codebase Context

### Architecture
- **Framework**: React 19 + TypeScript + Vite + Tauri v2 (desktop wrapper)
- **State**: Plain `useState` in `App.tsx`, props drilled to children. No Redux/Zustand.
- **Persistence**: IndexedDB via Dexie.js v4. Fire-and-forget async saves.
- **Styling**: Tailwind CSS + custom CSS variables. 5 themes (Warm, Dark, Ocean, Forest, Midnight) applied via `applyTheme()` which sets `--kebab-case` CSS vars from `camelCase` theme properties.
- **Music theory**: `@tonaljs/tonal` v4.10.0 — currently only `Chord.get()` is used.

### Data model
```typescript
// src/types/song.ts
Song { id, name, progressions: NamedProgression[], tuning, capoSettings, bpm, timeSignature?, pairings?, leadIds? }
NamedProgression { id, name, chords: Chord[], bpm? }

// src/types/chord.ts
Chord { name: string, notes: string[], voicing?: ChordVoicing, beats?: number }
ChordVoicing { frets: (number | null)[], tuningId: string }

// src/types/lead.ts
Lead { id, name, notes: LeadNote[], tuningId, createdAt, updatedAt }
LeadNote { note: string, stringIndex: number, fret: number }
```

### Existing music theory code
- `src/lib/chordUtils.ts` (128 lines) — `getNotesForChord()`, `findChordByNotes()`, `isValidChord()`, `getChordSuggestions()`. Uses `Chord.get()` from tonal.
- `src/lib/songAnalysis.ts` (68 lines) — `getUniqueNotesFromSong()`, `describeSongScale()`, `getSongStats()`. Very basic — just collects unique notes, no key/scale/function detection.
- `src/components/SongScale.tsx` (95 lines) — Shows unique note badges + optional fretboard. No harmonic analysis.

### @tonaljs/tonal capabilities (tested, all work)
```
Key.majorKey('C') → { scale: ['C','D','E','F','G','A','B'],
                       chords: ['Cmaj7','Dm7','Em7','Fmaj7','G7','Am7','Bm7b5'],
                       chordsHarmonicFunction: ['T','SD','T','SD','D','T','D'],
                       grades: ['I','II','III','IV','V','VI','VII'] }

Key.minorKey('A') → { natural: { scale, chords }, harmonic: { scale, chords }, melodic: { scale, chords } }

Scale.detect(['C','D','E','F','G','A','B']) → ['C major', 'C bebop', ...]
Scale.detect(['A','B','C','D','E','F','G']) → ['A minor', ...]

Progression.toRomanNumerals('C', ['Dm7','G7','Cmaj7']) → ['IIm7','V7','Imaj7']
Progression.toRomanNumerals('C', ['Am','F','C','G'])   → ['VIm','IV','I','V']

Chord.get('Cmaj9')  → { notes: ['C','E','G','B','D'] }
Chord.get('G7b9')   → { notes: ['G','B','D','F','Ab'] }
Chord.get('G7#11')  → { notes: ['G','B','D','F','C#'] }

Note.transpose('D', '5P') → 'A'  (fifth above)
Note.transpose('D', '-5P') → 'G' (fifth below)
```

### UI component hierarchy
```
App.tsx (765 lines — root state, all handlers)
├── Sticky Header (brand + toolbar + song info)
├── SongScale.tsx (basic note display — to be augmented)
├── SongProgressions.tsx (722 lines)
│   ├── Pairing chips row
│   ├── Lead chips row + LeadSelector + LeadEditor
│   ├── PairedProgressionPanel (paired progressions timeline)
│   ├── Header (progression count + add + pair buttons)
│   └── SortableProgressionItem (per progression, collapsible)
│       ├── ChordForm + New Voicing button
│       └── SortableChordGrid.tsx (85 lines)
│           └── DraggableChordCard.tsx (269 lines, per chord)
│               ├── Chord name + action buttons
│               ├── ChordDiagram (TAB or dot view)
│               ├── FretboardDiagram (with lead overlay)
│               └── ChordVoicingEditor
└── BackupManager
```

### Existing toggle/chip patterns
- **Pairing chips**: `pairing-chip` / `pairing-chip--active` classes, inline-flex rounded-full pills
- **Lead chips**: Similar pattern with `var(--lead)` / `var(--lead-subtle)` colors, dashed border for "+ Lead" button
- **State pattern**: `const [activePairingId, setActivePairingId] = useState<string | null>(null)` — click toggles on/off

### Database (Dexie v4)
```
songs: 'id, name, updatedAt, lastOpened'
appState: 'key'              ← stores theme, activeLeadId, etc.
savedVoicings: 'id, name, tuningId'
leads: 'id, name, tuningId, updatedAt'
```

---

## Feature Plan

### Design Principle: Fully Optional Layer

Harmonic analysis is an **additive overlay** — the app must feel complete without it. Everything works whether analysis is on or off: progressions, chord editing, leads, export, pairing. When toggled off, zero analysis code runs and zero analysis UI renders.

- **Not coupled to leads**: The lead system is user-driven creative input. Harmonic analysis is computed insight. They are independent features that may coexist visually but have no data dependencies on each other.
- **No required state**: Analysis is derived on-the-fly from existing chord data via `useMemo`. It adds no required fields to `Song`, `Chord`, or `Lead` types.
- **Clean toggle boundary**: `analysisEnabled` gates all analysis computation and rendering. Components receive `analysis?: ...` optional props and render nothing when absent.

### Analysis Engine — `src/lib/harmonicAnalysis.ts` (new)

#### Data structures

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

#### Key detection algorithm

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

#### Per-chord analysis algorithm

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

#### Exported functions

- `analyzeProgression(chords: Chord[]): ProgressionAnalysis`
- `detectKey(chords: Chord[]): HarmonicContext`
- `analyzeChord(chordName: string, context: HarmonicContext): ChordAnalysis`
- `getCircleOfFifths(): string[]` — static ordered array of all 12 keys

---

### Theme Colors — `src/lib/theme.ts`

Add `analysis` and `analysisSubtle` to `Theme.colors` interface. Applied as `--analysis` and `--analysis-subtle` CSS variables via existing `applyTheme()`.

| Theme    | `analysis`         | `analysisSubtle`            |
|----------|--------------------|-----------------------------|
| Warm     | `#d97706` (amber)  | `rgba(217,119,6,0.12)`      |
| Dark     | `#facc15` (yellow) | `rgba(250,204,21,0.12)`     |
| Ocean    | `#f0abfc` (pink)   | `rgba(240,171,252,0.12)`    |
| Forest   | `#fbbf24` (amber)  | `rgba(251,191,36,0.12)`     |
| Midnight | `#c084fc` (purple) | `rgba(192,132,252,0.12)`    |

Add defaults to `:root` in `src/index.css`.

#### Harmonic function color coding (used on circle slices, note pills, chord badges)

| Function              | Color  | Meaning               |
|-----------------------|--------|-----------------------|
| **Tonic** (Home)      | Blue   | Stability, rest       |
| **Subdominant** (Away)| Green  | Movement, departure   |
| **Dominant** (Tension)| Red    | Tension, needs resolution |

These map to CSS vars `--fn-tonic`, `--fn-subdominant`, `--fn-dominant` per theme. Used to color circle slices, Roman numeral badges, and note pills based on their harmonic role.

---

### New Components

#### 1. `HarmonicAnalysisPanel.tsx` — Main analysis panel

Replaces/augments `SongScale` section when analysis is enabled. Shows:

- **Key badge**: Detected key, e.g. "C Major" or "A Minor"
- **Alternate keys**: Small text showing other possibilities
- **Scale notes**: Note pills colored by function
- **Circle of fifths mini-view**: SVG circle with 12 key positions
  - Current key highlighted with `var(--analysis)`
  - Diatonic chords highlighted with `var(--analysis-subtle)`
  - Active chord gets a ring indicator
  - Fifth neighbors connected with lines
  - **Heat map mode**: Slices adjacent to current key glow brightest (safe transitions), distant slices glow dimly (adventurous/modal). Helps suggest pivot chords for bridging to neighboring keys.
  - **Concentric rings**: Inner ring = current key diatonic chords, outer ring = parallel minor diatonic chords. Highlights where borrowed chords (bVI, bVII, iv) diverge from the major ring.
  - **Diameter line**: For any dominant 7th chord, draw a line through center to its tritone sub (e.g., G7 ↔ Db7). Simple geometry makes jazz substitutions intuitive.
  - **Path trace**: Trace the progression's movement around the circle. Clockwise = tension/lifting, counter-clockwise = resolution/homecoming. Flag jumpy paths as "High Complexity" and tight clusters as "Harmonically Stable."
- **Progression movement**: Harmonic movement as arrows (e.g., ii → V → I)

Circle of fifths SVG: 12 circles in a ring via trigonometry (`cx = center + r * cos(angle)`). Order: C, G, D, A, E, B, F#/Gb, Db, Ab, Eb, Bb, F.

**Tooltips & flyouts on the circle:**
Every visual indicator on the circle should have a brief explanation on hover/tap so users learn *why* something is highlighted, not just *that* it is.

| Visual element             | Tooltip content                                                                                          |
|----------------------------|----------------------------------------------------------------------------------------------------------|
| Heat map glow (bright)     | "G Major shares 6 of 7 notes with C Major — smooth key change"                                          |
| Heat map glow (dim)        | "F# Major shares only 2 notes with C Major — distant, dramatic shift"                                   |
| Concentric outer ring chord| "Fm is borrowed from C Minor — adds a darker color without leaving the key"                              |
| Diameter line              | "Db7 is the tritone sub of G7 — they share the same tension notes (B and F), so one can replace the other" |
| Path trace arrow (CW)      | "Moving up a fifth (C → G) builds tension — pulls away from home"                                       |
| Path trace arrow (CCW)     | "Moving down a fifth (G → C) resolves — the strongest pull back home"                                   |
| Neighbor key highlight     | "F Major is one step left on the circle — a natural bridge destination"                                  |

```typescript
interface HarmonicAnalysisPanelProps {
  analysis: ProgressionAnalysis | null;
  activeChordIndex?: number;
}
```

#### 2. `ChordAnalysisOverlay.tsx` — Per-chord analysis section

Rendered inside `DraggableChordCard` when analysis is enabled. Compact by default (Roman numeral + function), expandable on click.

- **Header**: Roman numeral + function badge (e.g., `ii7 · Subdominant`)
- **Expanded detail**:
  - Chord tones labeled as root/3rd/5th/7th with colored dots
  - Available extensions: pills for 9, 11, 13, sus2, sus4 — with "Aura" interaction: glowing extension slices on the circle can be tapped to instantly add the note to the chord voicing
  - Substitutions: chord name pills
  - **Ghost circle**: When editing a chord, show a faint Circle of Fifths in the background. As the user explores, show the relationship of the hovered note to the root key.

**Tooltips & flyouts on chord analysis items:**
Each suggestion pill/badge in the overlay should explain itself via tooltip so the user builds intuition over time.

| Element                    | Tooltip content                                                                                     |
|----------------------------|-----------------------------------------------------------------------------------------------------|
| Roman numeral badge        | "ii means this is the 2nd degree of C Major — it naturally wants to move to V (G)"                  |
| Function label (Tonic)     | "Tonic chords feel like home — stable resting points"                                               |
| Function label (Dominant)  | "Dominant chords create tension — they pull strongly toward the tonic"                               |
| Function label (Subdominant)| "Subdominant chords move away from home — set up the dominant or return to tonic"                   |
| Extension pill (e.g. "9th")| "D is 2 steps clockwise from C on the circle of fifths — close enough to blend, far enough to add color" |
| Substitution pill          | "Fmaj7 shares 3 notes with Dm7 — can replace it for a brighter sound"                              |
| Tritone sub pill           | "Db7 sits directly opposite G7 on the circle — same tension, chromatic approach to C"               |
| Borrowed chord pill        | "Fm is from C Minor — borrowing it adds a bittersweet quality"                                      |

Flyout behavior: Tooltips appear on hover (desktop) or long-press (mobile). Keep text under 20 words. Use the actual key/chord names from the current context rather than generic placeholders.

```typescript
interface ChordAnalysisOverlayProps {
  analysis: ChordAnalysis;
  context: HarmonicContext;
}
```

---

### State Management — `src/App.tsx`

```typescript
const [analysisEnabled, setAnalysisEnabled] = useState(false);

// Memoized analysis (recomputed only when progressions change)
const progressionAnalysis = useMemo(() => {
  if (!analysisEnabled || !currentSong) return null;
  const allChords = currentSong.progressions.flatMap(p => p.chords);
  if (allChords.length === 0) return null;
  return analyzeProgression(allChords);
}, [analysisEnabled, currentSong?.progressions]);
```

Persist toggle in `appState` table (like `activeLeadId`). Load in `init()`.

---

### Modified Components

#### `SongProgressions.tsx`
- Add `analysisEnabled`, `progressionAnalysis`, `onToggleAnalysis` props
- Add **Analysis chip** in chips row: `[Pairings: ...] [Leads: ...] [Analysis ON/OFF]`
- Pass per-chord analysis to progression items → chord grid → chord cards

#### `SortableChordGrid.tsx`
- Add `chordAnalyses?: ChordAnalysis[]` and `harmonicContext?: HarmonicContext` props
- Pass corresponding `ChordAnalysis` to each `DraggableChordCard` by index

#### `DraggableChordCard.tsx`
- Add `chordAnalysis?: ChordAnalysis`, `harmonicContext?: HarmonicContext` props
- Render `ChordAnalysisOverlay` below chord diagram when analysis present

#### `SongScale.tsx`
- When analysis enabled → render `HarmonicAnalysisPanel` instead of basic scale view
- When off → existing behavior unchanged

#### `App.tsx`
- Add state + persistence
- Compute memoized `progressionAnalysis`
- Pass to SongProgressions and SongScale/HarmonicAnalysisPanel
- Load `analysisEnabled` from `appState` in init

---

### Prop Drilling Path

```
App.tsx (analysisEnabled, progressionAnalysis)
  → SongScale / HarmonicAnalysisPanel (analysis panel)
  → SongProgressions (toggle chip + per-chord data)
    → SortableProgressionItem (chordAnalyses[])
      → SortableChordGrid (chordAnalyses[])
        → DraggableChordCard (chordAnalysis, harmonicContext)
          → ChordAnalysisOverlay
```

---

### Implementation Order

**Phase 1: Analysis engine**
1. Create `src/lib/harmonicAnalysis.ts` — all pure functions
2. Key detection, chord analysis, extensions, substitutions, note classification

**Phase 2: Theme + toggle**
3. Add `analysis` / `analysisSubtle` colors to all themes
4. Add CSS variable defaults
5. Add `analysisEnabled` state to `App.tsx` with persistence
6. Add analysis toggle chip to `SongProgressions.tsx`

**Phase 3: Per-chord overlay**
7. Create `ChordAnalysisOverlay.tsx`
8. Thread analysis through `SortableChordGrid` → `DraggableChordCard`
9. Compute `progressionAnalysis` in `App.tsx` with `useMemo`

**Phase 4: Analysis panel + circle of fifths**
10. Create `HarmonicAnalysisPanel.tsx` with SVG circle of fifths
11. Replace `SongScale` when analysis enabled
12. Key detection, scale display, progression movement

**Phase 5: Polish + edge cases**
13. Edge cases: no chords, single chord, ambiguous keys
14. Verify clean toggle: analysis off → zero analysis UI, zero perf cost
15. Verify independence from lead system — both features work fully alone

---

### Key Files

**New:**
- `src/lib/harmonicAnalysis.ts`
- `src/components/HarmonicAnalysisPanel.tsx`
- `src/components/ChordAnalysisOverlay.tsx`

**Modified:**
- `src/lib/theme.ts`
- `src/index.css`
- `src/App.tsx`
- `src/components/SongProgressions.tsx`
- `src/components/SortableChordGrid.tsx`
- `src/components/DraggableChordCard.tsx`
- `src/components/SongScale.tsx`

---

### Verification

1. Toggle analysis on — key detected correctly for ii-V-I (Dm7-G7-Cmaj7 → C major)
2. Each chord card shows Roman numeral and function label
3. Expand chord analysis — extensions, substitutions, note classifications visible
4. Circle of fifths highlights current key and diatonic chords
5. Tooltips appear on hover for every indicator (circle highlights, pills, badges) explaining the "why"
6. Toggle off — all analysis UI disappears cleanly, no leftover artifacts
7. Switch themes — analysis colors adapt
8. Reload — toggle state persists
9. Lead system works independently — no behavior change with analysis on or off
