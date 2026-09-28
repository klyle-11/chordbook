# Chordbook

A desktop app for writing guitar and bass chord progressions: build songs from progressions, choose voicings, see every chord on one fretboard, and play it all back with a SoundFont synth.

Built with React + TypeScript + Vite, packaged as a desktop app with **Tauri v2**.

## Features

- **Songs → progressions → chords.** Drag to reorder chords and progressions, set beats per chord, BPM per progression, and a time signature. Pair progressions together.
- **Song fretboard in the header**, directly under the title. It shows the chord you click or that's playing, from any progression: every chord tone across all 24 frets, the chosen voicing highlighted, the root marked, and the next chord previewed. With nothing selected it shows all the notes in the song. It can be collapsed.
- **Chord cards** show a tab box when the chord has a voicing, or a chord diagram of the most common shape when it doesn't.
- **Default voicings** use the shapes most people play: open chords first, then E/A/D-shape barres. They adapt to the tuning, the capo, and 6-string or bass string counts.
- **Quick tab editor.** The pencil on a card, or double-clicking its diagram, opens a small editor over the card:
  - type fret numbers; ↑/↓ change string, ←/→ move ±1
  - `x` mutes, `a`–`g` picks a note, Space plays, Enter applies, Esc or clicking away cancels
  - if the tab adds notes outside the chord, it offers to rename it (for example C → Cadd9)
  - "More…" opens the full editor, where clicking notes on the header fretboard fills the tab
- **Voicing library.** Voicings are saved per tuning and suggested again when the same chord is added.
- **Add chords** by name (`Am7`, `F#m7b5`), by note list (`[C, E, G]`), or by typing tab.
- **Tunings and capo:** Standard, Half-step down, Drop D, D Standard, Drop C, Bass 4/5-string, and a capo up to fret 12.
- **Leads.** Build note sequences on a fretboard and overlay them on chords.
- **Harmonic analysis.** Key detection, Roman numerals, and functions per chord.
- **Song links.** A link icon next to the title stores URLs to tabs, notation or videos.
- **Import and export:** Guitar Pro (`.gp3/.gp4/.gp5`) import, PDF export, and JSON backups.
- **Audio.** SpessaSynth plays the bundled GeneralUser GS SoundFont (integrity-checked). Instruments: nylon guitar, piano, pad, strings, organ, and bass for bass tunings. Includes a metronome.
- Themes, with state stored locally in IndexedDB.

## Fret & capo conventions

- Fret arrays are ordered **high string first** (index 0 = high E), matching `Tuning.strings`.
- **Tab and voicing frets are relative to the capo**, as in printed tab: with capo 2, `0` means the capoed string. Note names, audio and fingering use `getSoundingTuning(tuning, capo)`. Only the fretboard drawing adds the capo back (`fret + capo`).
- Lead notes are currently stored at absolute frets (see [TODO.md](TODO.md)).
- Note comparisons go through `pitchClass()` in `src/lib/fretUtils.ts`, so any spelling works (`Eb`, `D#`, `E♭`, `F##`, `Cb`).

## Development

Prerequisites: Node 20+, npm, and for the desktop build the [Rust toolchain + Tauri prerequisites](https://v2.tauri.app/start/prerequisites/).

```bash
npm install          # also copies the SpessaSynth worklet into public/
npm run dev          # web app at http://localhost:5174
npm run tauri dev    # desktop app (starts Vite for you)
npm run tauri build  # desktop bundle (.app / .dmg / .msi / .deb …)
npm run build        # typecheck + production web build to dist/
npm run lint
```

## Project layout

```
src/
  App.tsx                     app state (songs, leads, settings) and persistence calls
  components/
    SongManager.tsx           song list + song header (title, links, tuning/capo, actions)
    SongFretboard.tsx         the header fretboard
    SongProgressions.tsx      progressions, pairings, leads
    SortableChordGrid.tsx     chord cards, playback, full voicing editor
    DraggableChordCard.tsx    one chord card
    ChordDiagram.tsx          tab box / chord diagram + fingering fallback
    QuickTabEditor.tsx        keyboard tab editor popover
    ChordVoicingEditor.tsx    full voicing editor (library save)
    FretboardDiagram.tsx      24-fret neck
  lib/
    fretUtils.ts              pitch classes, note-at-fret, notes from a voicing
    tunings.ts                tunings, capo (getSoundingTuning)
    defaultVoicings.ts        common chord shapes for any tuning/capo
    chordUtils.ts             chord names ↔ notes (tonal), rename suggestions
    harmonicAnalysis.ts       key + function analysis
    audioPlayer.ts            SpessaSynth SoundFont playback
    db.ts                     Dexie (IndexedDB) schema
    fretboardFocus.ts         context: which chord the header fretboard shows
src-tauri/                    Tauri shell
```

## Tech stack

React 19, TypeScript, Vite, Tailwind CSS v4, Tauri v2, Dexie (IndexedDB), @tonaljs/tonal, @dnd-kit, SpessaSynth, jsPDF.

## Roadmap

See [TODO.md](TODO.md) for known issues, the architecture and native-feature evaluation, and ideas.
