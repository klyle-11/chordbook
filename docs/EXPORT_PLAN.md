# Export / print plan: consolidated, scale-first sheets

## Why

Today's export (`src/components/PDFExportDialog.tsx` + `src/lib/pdfExport.ts`) has two main problems:

- **One neck per chord.** It renders a full 24-fret `FretboardDiagram` for every chord in every progression, two per row and a page per progression. A 4-progression song with 16 chords prints 16 near-identical necks.
- **Raster output.** The page is screenshotted with `html2canvas`, so the PDF is blurry and large and slow to make. It also needs a sanitiser for CSS colour functions `html2canvas` can't parse (`oklch`), and `html2canvas` + `jspdf` are most of the 1.1 MB bundle.

Most chords in a song share one key, so a single scale map of the neck, plus small chord boxes and the progression lines, says the same thing on one or two pages.

## Target sheet (default "Cheat sheet" layout, 1–2 pages)

1. **Header.** Title, tuning, capo, BPM, time signature, song links (as URLs).
2. **Scale map.** One full-neck fretboard per key area, showing the song's bebop scale:
   - scale tones as small dots
   - the tonic chord's tones as solid markers, root highlighted
   - the bebop passing tone as a hollow or differently coloured dot, labelled "passing"
   - optional CAGED/position boxes (5 shaded windows) and fret inlays
3. **Chord vocabulary.** Each *unique* voicing appears once as a small chord box (the card-sized diagram or tab box), with finger numbers, 6–8 per row.
   - Chords whose notes are all inside the scale are unmarked.
   - Chords outside the scale get a tag, e.g. "B7 — outside: D#", with the outside notes circled.
4. **Progressions as lead-sheet lines.** Chord symbols with beats, e.g. `| Am7 . . . | D7 . . . | Gmaj7 . . . . . . . |`, plus Roman numerals from `harmonicAnalysis` when analysis is on. No diagrams here, because the vocabulary above covers them.
5. **Leads** (optional). Each lead as a single tab staff (capo-relative frets, now that leads use that convention).

The **"Full detail"** layout keeps a per-chord neck, but only for chords outside the scale, never for all of them.

## Choosing the scale (bebop first)

tonal already defines the bebop family. Its note sets were checked against C:

| Detected centre / tonic quality | Scale | tonal name | C example | Added passing tone |
|---|---|---|---|---|
| Major, tonic `maj7` / `6` / triad (Ionian) | Bebop major | `bebop major` | C D E F G G# A B | #5 |
| Dominant / Mixolydian / blues (I7 or V7-heavy) | Bebop dominant | `bebop` | C D E F G A Bb B | maj 7 |
| Minor with `m7` tonic (Dorian) | Bebop minor (Dorian) | `bebop minor` | C D Eb E F G A Bb | maj 3 |
| Minor, `m(maj7)` or harmonic/melodic colour | Minor bebop | `minor bebop` | C D Eb F G Ab Bb B | maj 7 |
| Half-diminished tonic (`m7b5`) | Bebop locrian | `bebop locrian` | C Db Eb F Gb G Ab Bb | nat 5 |
| Natural minor (Aeolian) | Minor bebop, falling back to Aeolian if the ♮7 clashes with a ♭VII chord | — | — | — |

**How it's picked:**

1. `detectKey()` in `src/lib/harmonicAnalysis.ts` already scores candidates. Extend it to return the **mode** and the **tonic chord quality** (from the first/last chord and cadences), not just major or minor.
2. A new `suggestScale(analysis)` maps that to a bebop scale using the table. It returns the 7-note parent scale too, so "outside" checks use the parent and the passing tone never counts as outside.
3. **Key areas:** analyse each progression separately. When a progression's centre differs from the song's (e.g. a bridge in the relative major or a modulation), print a separate scale map for it and label it with the progression names. Most songs get one.
4. A dropdown in the dialog can override the choice (any bebop scale, the parent mode, pentatonic or blues).

## Rendering: vector, not screenshots

- **New pure SVG renderers** in `src/lib/print/`, no React:
  - `fretboardSvg()`, `chordBoxSvg()`, `tabStaffSvg()` and `leadSheetLine()`
  - they reuse `lib/music` (`getSoundingTuning`, `getFretsForNoteOnString`, `calculateChordFingering`)
- **Print:** a `PrintSheet` component lays these out, with `@media print` CSS, and prints via `window.print()`. That opens the system print dialog (which includes Save as PDF on macOS), and in Tauri it uses the webview's print.
- **Download PDF:** `jsPDF` + `svg2pdf.js` draw the same SVGs as vectors. The result is crisp at any zoom and tens of KB instead of MB.
- Remove `html2canvas` and the `oklch` sanitiser, and lazy-load the export code (`import()`), so it no longer weighs down app start-up.
- Ink-friendly: the print always uses a light palette (black and greys plus one accent), whatever the app theme. Optionally print the wood style in greyscale.

## Dialog

- **Presets:**
  - *Cheat sheet* (scale map, vocabulary, progression lines)
  - *Lead sheet* (progression lines with chord boxes above the symbols)
  - *Full detail* (adds outside-chord necks and leads)
- **Toggles:** each section, CAGED boxes, Roman numerals, finger numbers, capo-relative vs absolute fret numbers.
- **Paper:** size, orientation, and chord boxes per row.
- A live preview of the sheet itself, so you see exactly what prints.

## Phases

1. **Analysis.**
   - `src/lib/music/scales.ts`: `suggestScale()`, and the parent-scale and passing-tone helpers.
   - Extend `detectKey()` to return mode and tonic quality.
   - Tests: the table above, and fixture progressions (ii–V–I in C → bebop major; 12-bar blues in A → bebop dominant; Dorian vamp Dm7–G7 → bebop minor on D; Am–G–F–E → minor bebop).
2. **SVG renderers.** `src/lib/print/*.ts`, with snapshot tests of the SVG strings, plus a capo case and a bass case.
3. **Print sheet.** Add `PrintSheet.tsx` + print CSS + `window.print()`, and replace the current `PrintableContent`.
4. **Vector PDF.** `jsPDF` + `svg2pdf.js`; delete the `html2canvas` path; lazy-load it.
5. **Key areas and extras.** Per-progression key areas, CAGED boxes, a chord-sheet (lyrics) layout once ChordPro import exists.

## Verification

- `npm test`: scale selection fixtures, and SVG snapshots of each renderer.
- Export a 4-progression demo song in each preset. Check:
  - the page count (cheat sheet ≤ 2 pages)
  - that each unique voicing appears exactly once
  - that the outside-chord tags match the analysis panel
  - that the PDF text is selectable (vector) and the file is under 200 KB
- Print from `npm run tauri dev` on macOS: the system dialog appears and Save as PDF works.
