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
- [x] **Better default voicings** (`src/lib/defaultVoicings.ts`):
  - Open chords first, then E/A/D-shape barres, covering 17 chord qualities.
  - Mapped onto any 6-string tuning or capo (half-step down, D standard, drop D/C) by working out the neck shift and per-string offsets.
  - Bass tunings get root–5th–octave shapes.
  - Every shape is checked to sound only chord tones, including the root.
- [x] **Capo fixes.** The fretboard drew notes shifted by the capo amount, and audio and note naming ignored the capo. There is now a single convention (see the README): tab and voicing frets are **relative to the capo**, and only fretboard drawing adds the capo back.
- [x] **Enharmonic fixes.** One `pitchClass()` in `fretUtils.ts` handles `E#`, `B#`, `F##`, `Cb` and unicode `♭`/`♯`. Before, D# major's `F##`, A#m's `E#` and custom `B♭` notes silently vanished from fretboards and fingerings, and tab-entered Eb/Ab/Bb chords were never named.
- [x] **Song-wide fretboard in the song header**, under the title. It shows the clicked or playing chord from any progression, with the voicing highlighted and the next chord previewed. With nothing selected it shows every note in the song, and it can be collapsed. The per-progression fretboards are gone; chord cards are unchanged.
- [x] **Song links:** a link icon next to the title opens a small popover that lists saved links (tabs, notation, videos) and adds new ones. Only http(s) links are accepted; they are stored on the song and included in backups.
- [x] Removed dead code: 13 unused components, `traditionalChordShapes.ts`, `inputValidation.ts`, and duplicated `CHROMATIC`/`FLAT_TO_SHARP` tables.

## Bugs / correctness

- [ ] **Two fret conventions.** Leads store *absolute* frets (from the nut) while chords store capo-relative frets. Pick one (capo-relative matches tab) and migrate `Lead.notes`.
- [ ] Voicings store `tuningId` but not the capo. Changing a song's capo re-pitches every saved voicing. That's correct for tab, but it could warn the user ("voicings follow the capo").
- [ ] `saveSongsAsync` runs `clear()` + `bulkPut(allSongs)` on **every** edit. A crash mid-write can lose data, and it gets slower as the library grows. Use `db.songs.put(song)` for the one song that changed.
- [ ] Custom chords live in `localStorage`; everything else is in IndexedDB. They're also read and JSON-parsed on every `getNotesForChord` call. Move them into Dexie and cache them in memory.
- [ ] `backfillVoicings` and `handleAddChord` match library voicings by stripping a `" <n>"` suffix from the name. Store `chordName` on `SavedVoicing` instead.
- [ ] New progressions are named `Progression <timestamp>`; use "Progression N".
- [ ] `progressionAnalysis` `useMemo` depends on `currentSong?.progressions` but reads `currentSong` (lint warning).
- [ ] Two lint `no-empty` catch blocks in `App.tsx`, plus unused `_` params (`npm run lint` has 11 errors; all pre-existing).
- [ ] `target="_blank"` links may not open the system browser inside Tauri. Add `tauri-plugin-opener` and call `openUrl`.

## Architecture / efficiency

The app is small (~12k lines of TS/TSX, excluding CSS) and fast enough. The costs are in state handling, not computation.

- [ ] **`App.tsx` has ~30 handlers that all repeat `setSongs(prev => prev.map(song => … progressions.map(…)))` + `saveSongs`.** Replace them with one `updateSong(id, fn)` / `updateProgression(songId, progId, fn)` helper, or a small `useReducer`/Zustand store. That removes ~400 lines and the bug class where one handler forgets `updatedAt` or the save.
- [ ] Prop drilling: `SongProgressions` takes ~40 props. The store above, or context for song-level callbacks, fixes it. The fretboard already uses a context (`lib/fretboardFocus.ts`) as the pattern.
- [ ] `DraggableChordCard` runs one IndexedDB query per card for saved voicings. Load the voicing library once per tuning, keep it in memory, and share it.
- [ ] Drag-and-drop ids are `chord-${index}`, so React keys change on reorder. Give chords a stable `id`.
- [ ] Heavy inline `style={{…}}` objects and hover handlers written in JS. Move them to CSS classes, as the header/links/quick-editor now do.
- [ ] `calculateChordFingering` is exported from a component file (`ChordDiagram.tsx`), which breaks fast refresh. Move it to `lib/`.
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

- **Current map:** `lib/fretUtils.ts` (notes and pitch classes), `lib/tunings.ts` (tunings and capo), `lib/defaultVoicings.ts` (common shapes), `components/ChordDiagram.tsx` (finger numbers plus the fallback search), `lib/chordUtils.ts` (naming via tonal).
- [ ] Consolidate these into `lib/music/` (`notes.ts`, `tunings.ts`, `voicings.ts`, `fingering.ts`) with no React imports, and add tests.
- [ ] Unit tests (vitest) for `pitchClass`, `getDefaultVoicing` across all tunings, `findChordByNotes`, the capo round-trips, and `suggestRenameForTab`. The checks run in this pass were ad-hoc scripts; make them permanent.
- [ ] `assignFingerNumbers` is naive: it treats any 3+ strings on the lowest fret as a barre, and doesn't handle partial barres or thumb-over. Store fingers in the shape table instead.
- [ ] Slash chords and inversions (`C/G`) aren't parsed for diagrams; use tonal's `bass`.
- [ ] Cycle through alternative voicings (the next shape up the neck) on a card, using the other candidates `defaultVoicings` already computes.
- [ ] Bass shapes beyond root–5th–octave (add the 10th/3rd); 7-string and baritone tunings; custom tunings.
- [ ] Optional display toggle: capo-relative vs absolute fret numbers on the header fretboard.

## Ideas

- [ ] **Voice-leading picks:** choose each chord's default shape to minimise hand movement from the previous chord.
- [ ] **Capo suggestions:** "this song fits G shapes with capo 2" (search capo 0–7 for the most open shapes).
- [ ] Transpose a whole song or progression, keeping voicings where the shapes allow.
- [ ] Setlist / performance mode: the header fretboard plus a big current/next chord, auto-advancing with the metronome.
- [ ] Link previews in the links popover: favicon or type icon for YouTube, Songsterr, Ultimate Guitar, PDF.
- [ ] Import a chord sheet (ChordPro / plain text with chords above lyrics) into progressions.
- [ ] CI: `tsc -b`, `eslint`, and the tests on each push.
