import type { Song } from '../types/song';
import type { Lead } from '../types/lead';
import { embedSongFile, extractSongFile, SONG_FILE_VERSION, type SongFile } from './songFile';
import { generateSongId } from './songStorage';
import { getAllLeads, getLeadsForSong, saveLead } from './leadStorage';
import { getSavedVoicings, hasVoicing, saveVoicing } from './savedVoicingLibrary';
import { getCustomChords, addCustomChord, isCustomChord } from './customChordLibrary';
import { pitchClassKey } from './music/notes';

// The single-file viewer, built by `npm run build:viewer` into public/
const VIEWER_SHELL_PATH = './song-viewer.html';

/** Gather a song with its leads, and the custom chords and saved voicings its chords use. */
async function createSongFile(song: Song): Promise<SongFile> {
  const chords = song.progressions.flatMap(p => p.chords);
  const chordNames = new Set(chords.map(c => c.name));
  const chordNoteKeys = new Set(chords.filter(c => c.notes.length > 0).map(c => pitchClassKey(c.notes)));

  return {
    format: 'chordbook-song',
    version: SONG_FILE_VERSION,
    exportedAt: new Date(),
    themeId: document.documentElement.getAttribute('data-theme') ?? undefined,
    song,
    leads: await getLeadsForSong(song.leadIds || []),
    customChords: getCustomChords().filter(c => chordNames.has(c.name)),
    savedVoicings: (await getSavedVoicings()).filter(v => chordNoteKeys.has(pitchClassKey(v.notes))),
  };
}

/** Download the song as a self-contained, read-only HTML page that works offline. */
export async function exportSongAsHtml(song: Song): Promise<void> {
  const response = await fetch(VIEWER_SHELL_PATH);
  if (!response.ok) throw new Error(`Song viewer not found (${response.status})`);
  // Throws if this isn't the viewer (the dev server answers a missing file with the app page)
  const html = embedSongFile(await response.text(), await createSongFile(song));

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${song.name.trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'song'}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Bring an exported HTML file back as an editable song. Its leads, custom chords and
 * saved voicings are added to the library unless an identical one is already there.
 * Returns the song to add; it gets a new id (and name) if that song is already in `existingSongs`.
 */
export async function importSongFromHtml(html: string, existingSongs: Song[]): Promise<Song> {
  const file = extractSongFile(html);

  // Leads get new ids, except where the very same lead already exists
  const existingLeads = await getAllLeads();
  const sameLead = (a: Lead, b: Lead) =>
    a.name === b.name && a.tuningId === b.tuningId && JSON.stringify(a.notes) === JSON.stringify(b.notes);
  const leadIds = new Map<string, string>();
  for (const lead of file.leads) {
    const existing = existingLeads.find(l => sameLead(l, lead));
    leadIds.set(lead.id, existing?.id ?? await saveLead({ name: lead.name, notes: lead.notes, tuningId: lead.tuningId }));
  }

  for (const chord of file.customChords) {
    if (!isCustomChord(chord.name)) addCustomChord(chord.name, chord.notes);
  }
  for (const { name, tuningId, frets, notes } of file.savedVoicings) {
    if (!(await hasVoicing(frets, tuningId))) await saveVoicing({ name, tuningId, frets, notes });
  }

  const alreadyHere = existingSongs.some(s => s.id === file.song.id);
  const now = new Date();
  return {
    ...file.song,
    id: alreadyHere ? generateSongId() : file.song.id,
    name: alreadyHere ? `${file.song.name} (imported)` : file.song.name,
    leadIds: (file.song.leadIds || []).map(id => leadIds.get(id)).filter((id): id is string => id !== undefined),
    updatedAt: now,
    lastOpened: now,
  };
}
