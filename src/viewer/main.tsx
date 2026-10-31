import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import ViewerApp from './ViewerApp.tsx'
import ErrorBoundary from '../components/ErrorBoundary.tsx'
import { parseSongFile, SONG_FILE_ELEMENT_ID, type SongFile } from '../lib/songFile'
import { setCustomChords } from '../lib/customChordLibrary'
import { applyTheme, getThemeById } from '../lib/theme'

function readSongFile(): SongFile | null {
  try {
    const json = document.getElementById(SONG_FILE_ELEMENT_ID)?.textContent
    return json ? parseSongFile(json) : null
  } catch (error) {
    console.error('Could not read the song in this file:', error)
    return null
  }
}

const file = readSongFile()
applyTheme(getThemeById(file?.themeId ?? ''))

if (file) {
  // Before the song renders: chord lookups read custom chords from this cache
  setCustomChords(file.customChords)
  document.title = `${file.song.name} — Chordbook`
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      {file ? <ViewerApp file={file} /> : (
        <p style={{ padding: 24, color: 'var(--text-secondary)' }}>
          This file has no song in it. Export one from Chordbook (HTML button on the song page).
        </p>
      )}
    </ErrorBoundary>
  </StrictMode>,
)
