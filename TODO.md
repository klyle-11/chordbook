# Chordbook — TODO & evaluation

Last reviewed: 2026-09-28. Items are roughly ordered by value within each section.

## Done in this pass

- [x] **Edit a chord's tab after it's placed.** The pencil on a card (or double-clicking its diagram) opens a quick editor over the card. It is keyboard-first:
  - digits enter the fret; two quick digits make a fret like 12
  - ↑/↓/Tab change string, ←/→ move the fret ±1
  - x mutes, a–g jumps to that note, Space plays
  - Enter applies; Esc or clicking away closes
  - "More…" opens the full editor, where clicking the fretboard fills the tab and you can save to the library
- [x] **Rename prompt when the tab changes the harmony.** For example, "Tab plays D (not in C). Rename to Cadd9". The chord name can also be edited directly in the progression toolbar (this replaces the old `handleChordReplace` stub).
- [x] **Voicing edits stay per chord.** Applying a voicing no longer overwrites every same-named chord in every song. It only fills same-named chords that have *no* voicing, in songs with the same tuning. Library auto-save skips exact duplicates.
- [x] **Better default voicings** (`src/lib/music/voicings.ts`):
  - Open chords first, then E/A/D-shape barres, covering 17 chord qualities.
  - Mapped onto any 6-string tuning or capo (half-step down, D standard, drop D/C) by working out the neck shift and per-string offsets.
  - Bass tunings get root–5th–octave shapes.
  - Every shape is checked to sound only chord tones, including the root.
- [x] **Capo fixes.** The fretboard drew notes shifted by the capo amount, and audio and note naming ignored the capo. There is now a single convention (see the README): tab and voicing frets are **relative to the capo**, and only fretboard drawing adds the capo back.
- [x] **Enharmonic fixes.** One `pitchClass()` in `lib/music/notes.ts` handles `E#`, `B#`, `F##`, `Cb` and unicode `♭`/`♯`. Before, D# major's `F##`, A#m's `E#` and custom `B♭` notes silently vanished from fretboards and fingerings, and tab-entered Eb/Ab/Bb chords were never named.
- [x] **Song-wide fretboard in the song header**, under the title. It shows the clicked or playing chord from any progression, with the voicing highlighted and the next chord previewed. With nothing selected it shows every note in the song, and it can be collapsed. The per-progression fretboards are gone; chord cards are unchanged.
- [x] **Song links:** a link icon next to the title opens a small popover that lists saved links (tabs, notation, videos) and adds new ones. Only http(s) links are accepted; they are stored on the song and included in backups.
- [x] Removed dead code: 13 unused components, `traditionalChordShapes.ts`, `inputValidation.ts`, and duplicated `CHROMATIC`/`FLAT_TO_SHARP` tables.

- [x] **Themes:** Ocean and Forest (dark page with near-white cards) replaced by light palettes: **Lime**, **Lavender** (periwinkle → indigo), **Sky** (sky blue on sepia-warm neutrals), **Citrus** (yellow → hot orange), **Blossom** (light → hot pink). Warm, Dark and Midnight kept. Saved `ocean`/`forest` choices map to Sky/Lime. Hardcoded grays and whites in chord diagrams, editable titles and progression headers now follow the theme.
- [x] **Wood fretboard style** (Wood/Flat toggle on the header fretboard): rosewood neck, nickel strings, ivory markers, amber root, pearl inlays. Marker colours are CSS variables (`--marker-*`), so more styles are cheap to add.

## Export / print

- [ ] Consolidated, scale-first export (a single bebop scale map per key area, each unique voicing once, progressions as lead-sheet lines, vector PDF). Full plan: [docs/EXPORT_PLAN.md](docs/EXPORT_PLAN.md).

## Bugs / correctness

- [x] **One fret convention.** Leads are now capo-relative like tab and voicings. A one-time migration (`migrateLeadFretsToCapoRelative`) uses each note's stored name to decide whether it was saved absolute (hand-built) or already relative (Guitar Pro import).
- [ ] A lead shared by songs with different capos will be pitched by each song's capo. Consider storing the capo on the lead, or warning.
- [x] Changing the capo shows a notice: "Tabs keep their shapes — N voiced chords now sound k semitones higher/lower".
- [x] `saveSongs` writes only the songs that changed, plus deletions, compared by object reference against the last save; a failed write retries on the next save. Backup restore uses an explicit `replaceAllSongsAsync`.
- [x] Custom chords moved to IndexedDB (Dexie v5 `customChords`) with an in-memory cache, and migrated from `localStorage` once.
- [x] Backups (format 3.1) now include custom chords and the saved-voicing library; 3.0 backups still restore.
- [ ] `parseChordInput` turns `bb` into a single flat and rejects `E#`/`Cb`; parse with `pitchClass` instead.
- [ ] Guitar Pro import ignores the track's capo; set the song capo from it.
- [ ] `backfillVoicings` and `handleAddChord` match library voicings by stripping a `" <n>"` suffix from the name. Store `chordName` on `SavedVoicing` instead.
- [ ] New progressions are named `Progression <timestamp>`; use "Progression N".
- [ ] `progressionAnalysis` `useMemo` depends on `currentSong?.progressions` but reads `currentSong` (lint warning).
- [ ] Two lint `no-empty` catch blocks in `App.tsx`, plus unused `_` params (`npm run lint` has 9 errors; all pre-existing).
- [ ] `target="_blank"` links may not open the system browser inside Tauri. Add `tauri-plugin-opener` and call `openUrl`.

## Architecture / efficiency

The app is small (~12k lines of TS/TSX, excluding CSS) and fast enough. The costs are in state handling, not computation.

- [ ] **`App.tsx` has ~30 handlers that all repeat `setSongs(prev => prev.map(song => … progressions.map(…)))` + `saveSongs`.** Replace them with one `updateSong(id, fn)` / `updateProgression(songId, progId, fn)` helper, or a small `useReducer`/Zustand store. That removes ~400 lines and the bug class where one handler forgets `updatedAt` or the save.
- [ ] Prop drilling: `SongProgressions` takes ~40 props. The store above, or context for song-level callbacks, fixes it. The fretboard already uses a context (`lib/fretboardFocus.ts`) as the pattern.
- [ ] `DraggableChordCard` runs one IndexedDB query per card for saved voicings. Load the voicing library once per tuning, keep it in memory, and share it.
- [ ] Drag-and-drop ids are `chord-${index}`, so React keys change on reorder. Give chords a stable `id`.
- [ ] Heavy inline `style={{…}}` objects and hover handlers written in JS. Move them to CSS classes, as the header/links/quick-editor now do.
- [ ] Stale Electron entry points (`electron-main.js/.cjs`, `dist-electron/`). The app ships with Tauri, so delete them.
- [ ] The bundle is 1.1 MB (jspdf + html2canvas). Lazy-load the PDF export with `import()`.

## Native: stay on Tauri, don't rewrite

- **Where it stands:** Tauri v2 is already the shell (the Rust side is an empty `run()`). The UI is React, audio is SpessaSynth (a SoundFont synth in an AudioWorklet), and storage is IndexedDB.
- **Performance:** the heaviest computation is note math over a 6×25 grid and a chord search over ~250 name candidates, all microseconds. Audio already runs off the main thread. A Swift/Rust/C++ rewrite would add cost without making anything perceptibly faster.
- **Native features that are worth it** (Tauri plugins, not a rewrite):
  - `opener`: song links open in the system browser.
  - `fs` + `dialog`: real file backups, and drag-and-drop Guitar Pro import from disk.
  - `window-state`: remember window size and position.
  - Web MIDI or a Rust `midir` command: play chords from a MIDI keyboard or guitar controller, and record voicings by playing them.
  - `global-shortcut`: a hands-free next-chord / play / stop, e.g. from a Bluetooth page-turner pedal.
  - Tauri mobile (iOS/Android) from the same code, since the layout already targets 360px.
- **When Rust would pay off:** real-time audio analysis (listening to the guitar to detect chords, a tuner). Put that in a Tauri command or a WASM module.

## Theory / voicing code: clarity

- [x] Consolidated into `src/lib/music/` with no React imports: `notes.ts`, `tunings.ts`, `voicings.ts`, `fingering.ts` (moved out of `ChordDiagram.tsx`), `chords.ts`.
- [x] Unit tests (vitest, `npm test`), 112 tests, including storage diff saves, the lead migration and custom-chord caching: `pitchClass` spellings, capo round-trips for every tuning × capo 0–12, the expected standard shapes, every root × quality × tuning (+ capo) sounding only chord tones in one hand position, `findChordByNotes`, `suggestRenameForTab`, and fingering.
- [ ] `assignFingerNumbers` is naive: it treats any 3+ strings on the lowest fret as a barre, and doesn't handle partial barres or thumb-over. Store fingers in the shape table instead.
- [ ] Slash chords and inversions (`C/G`) aren't parsed for diagrams; use tonal's `bass`.
- [ ] Cycle through alternative voicings (the next shape up the neck) on a card, using the other candidates `lib/music/voicings.ts` already computes.
- [ ] Bass shapes beyond root–5th–octave (add the 10th/3rd); 7-string and baritone tunings; custom tunings.
- [ ] Optional display toggle: capo-relative vs absolute fret numbers on the header fretboard.

## Ideas

- [ ] **Voice-leading picks:** choose each chord's default shape to minimise hand movement from the previous chord.
- [ ] **Capo suggestions:** "this song fits G shapes with capo 2" (search capo 0–7 for the most open shapes).
- [ ] Transpose a whole song or progression, keeping voicings where the shapes allow.
- [ ] Setlist / performance mode: the header fretboard plus a big current/next chord, auto-advancing with the metronome.
- [ ] Link previews in the links popover: favicon or type icon for YouTube, Songsterr, Ultimate Guitar, PDF.
- [ ] Import a chord sheet (ChordPro / plain text with chords above lyrics) into progressions.
- [ ] CI: `tsc -b`, `eslint`, and `npm test` on each push.
