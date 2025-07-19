import { useState, useRef } from 'react';
import type { Song } from '../types/song';
import type { PDFExportOptions } from '../lib/pdfExport';
import { exportSongToPDF, exportSongToPDFWithDiagrams, DEFAULT_PDF_OPTIONS } from '../lib/pdfExport';
import { formatSongInfo } from '../lib/displayUtils';
import { TraditionalChordDiagram } from './TraditionalChordDiagram';
import FretBoard from './Fretboard';

interface PDFExportDialogProps {
  song: Song;
  isOpen: boolean;
  onClose: () => void;
}

interface PrintableContentProps {
  song: Song;
  options: PDFExportOptions;
}

// Printable content component
function PrintableContent({ song, options }: PrintableContentProps) {
  return (
    <div className="bg-white p-8 min-h-screen pdf-export-content" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Header */}
      <div className="mb-8 page-break-inside-avoid">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">{song.name}</h1>
        <div className="text-sm text-gray-600 space-y-1 bg-gray-50 p-4 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <p><strong>Song Info:</strong> {formatSongInfo(song.tuning, song.capoSettings, song.bpm)}</p>
            <p><strong>Last Updated:</strong> {song.updatedAt.toLocaleDateString()}</p>
            <p><strong>Total Progressions:</strong> {song.progressions.length}</p>
            <p><strong>Total Chords:</strong> {song.progressions.reduce((sum, p) => sum + p.chords.length, 0)}</p>
          </div>
        </div>
      </div>

      {/* Scale Information */}
      {options.includeScale && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Scale Information</h2>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
              <div>
                <p><strong>Tuning:</strong> {song.tuning.strings.map(s => `${s.note}${s.octave}`).join(' - ')}</p>
                <p><strong>Tuning Name:</strong> {song.tuning.name}</p>
              </div>
              <div>
                {song.capoSettings.enabled && song.capoSettings.fret > 0 && (
                  <p><strong>Capo:</strong> Fret {song.capoSettings.fret}</p>
                )}
                <p><strong>Base Tempo:</strong> {song.bpm} BPM</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Progressions */}
      {song.progressions.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Chord Progressions</h2>
          
          {song.progressions.map((progression, index) => (
            <div key={progression.id} className="mb-12 page-break-inside-avoid">
              {/* Progression Header */}
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  {index + 1}. {progression.name}
                </h3>
                <div className="text-sm text-gray-600 mb-4">
                  <p><strong>Chords:</strong> {progression.chords.map(c => c.name).join(' → ')}</p>
                  <p><strong>BPM:</strong> {progression.bpm || song.bpm}{progression.bpm ? ' (custom)' : ''}</p>
                  <p><strong>Chord Count:</strong> {progression.chords.length}</p>
                </div>
              </div>

              {/* Traditional Chord Diagrams */}
              {options.includeTraditionalDiagrams && progression.chords.length > 0 && (
                <div className="mb-8">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">Traditional Chord Diagrams</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {progression.chords.map((chord, chordIndex) => (
                      <div key={`${chord.name}-${chordIndex}`} className="text-center">
                        <TraditionalChordDiagram 
                          chordName={chord.name} 
                          tuning={song.tuning}
                        />
                        <p className="text-sm text-gray-600 mt-2 font-medium">{chord.name}</p>
                        <p className="text-xs text-gray-500">Notes: {chord.notes.join(', ')}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Fretboard Diagrams */}
              {options.includeFretboardDiagrams && progression.chords.length > 0 && (
                <div className="mb-8">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">Fretboard Diagrams</h4>
                  <div className="space-y-6">
                    {progression.chords.map((chord, chordIndex) => (
                      <div key={`fret-${chord.name}-${chordIndex}`} className="page-break-inside-avoid">
                        <h5 className="text-md font-semibold text-gray-700 mb-3">
                          {chordIndex + 1}. {chord.name}
                        </h5>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <FretBoard 
                            chordNotes={chord.notes} 
                            tuning={song.tuning}
                            capoSettings={song.capoSettings}
                          />
                        </div>
                        <div className="mt-2 text-sm text-gray-600">
                          <p><strong>Chord Notes:</strong> {chord.notes.join(', ')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add page break after each progression except the last */}
              {index < song.progressions.length - 1 && (
                <div className="page-break-after"></div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-12 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
        <p>Generated by Chordbook on {new Date().toLocaleDateString()}</p>
      </div>
    </div>
  );
}

export default function PDFExportDialog({ song, isOpen, onClose }: PDFExportDialogProps) {
  console.log('PDFExportDialog rendered with isOpen:', isOpen);
  const [options, setOptions] = useState<PDFExportOptions>(DEFAULT_PDF_OPTIONS);
  const [isExporting, setIsExporting] = useState(false);
  const [exportMethod, setExportMethod] = useState<'text' | 'visual'>('visual');
  const printableRef = useRef<HTMLDivElement>(null);

  const handleExport = async () => {
    if (isExporting) return;
    
    setIsExporting(true);
    try {
      if (exportMethod === 'text') {
        await exportSongToPDF(song, options);
      } else if (printableRef.current) {
        await exportSongToPDFWithDiagrams(song, printableRef.current, options);
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800">Export PDF: {song.name}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Options */}
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Export Options</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Export Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Export Method
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="exportMethod"
                    value="visual"
                    checked={exportMethod === 'visual'}
                    onChange={(e) => setExportMethod(e.target.value as 'text' | 'visual')}
                    className="mr-2"
                  />
                  Visual (with diagrams) - Better quality
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="exportMethod"
                    value="text"
                    checked={exportMethod === 'text'}
                    onChange={(e) => setExportMethod(e.target.value as 'text' | 'visual')}
                    className="mr-2"
                  />
                  Text-based - Smaller file size
                </label>
              </div>
            </div>

            {/* Content Options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content to Include
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={options.includeScale}
                    onChange={(e) => setOptions({...options, includeScale: e.target.checked})}
                    className="mr-2"
                  />
                  Scale information
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={options.includeTraditionalDiagrams}
                    onChange={(e) => setOptions({...options, includeTraditionalDiagrams: e.target.checked})}
                    className="mr-2"
                  />
                  Traditional chord diagrams
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={options.includeFretboardDiagrams}
                    onChange={(e) => setOptions({...options, includeFretboardDiagrams: e.target.checked})}
                    className="mr-2"
                  />
                  Fretboard diagrams
                </label>
              </div>
            </div>

            {/* Format Options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Paper Size
              </label>
              <select
                value={options.paperSize}
                onChange={(e) => setOptions({...options, paperSize: e.target.value as 'a4' | 'letter'})}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="a4">A4</option>
                <option value="letter">Letter</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Orientation
              </label>
              <select
                value={options.orientation}
                onChange={(e) => setOptions({...options, orientation: e.target.value as 'portrait' | 'landscape'})}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </div>
          </div>
        </div>

        {/* Preview */}
        {exportMethod === 'visual' && (
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Preview</h3>
            <div 
              className="border border-gray-300 rounded-lg overflow-hidden bg-white max-h-96 overflow-y-auto"
              style={{ transform: 'scale(0.5)', transformOrigin: 'top left', width: '200%', height: '200%' }}
            >
              <PrintableContent song={song} options={options} />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="p-6 flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            disabled={isExporting}
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? 'Exporting...' : 'Export PDF'}
          </button>
        </div>
      </div>

      {/* Hidden printable content for visual export */}
      {exportMethod === 'visual' && (
        <div 
          ref={printableRef}
          className="fixed -top-[10000px] left-0 bg-white" 
          style={{ width: '210mm' }}
        >
          <PrintableContent song={song} options={options} />
        </div>
      )}
    </div>
  );
}
