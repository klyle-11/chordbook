import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { Song } from '../types/song';
import { formatSongInfo } from './displayUtils';
import { describeSongScale, getUniqueNotesFromSong } from './songAnalysis';

/** Save a jsPDF document using the native Save-As dialog when available, otherwise fall back to auto-download. */
async function savePdfWithPicker(pdf: jsPDF, defaultName: string): Promise<void> {
  const blob = pdf.output('blob');

  // Use File System Access API if available (Chromium)
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (window as unknown as { showSaveFilePicker: (opts: unknown) => Promise<FileSystemFileHandle> }).showSaveFilePicker({
        suggestedName: defaultName,
        types: [{
          description: 'PDF Document',
          accept: { 'application/pdf': ['.pdf'] },
        }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (err: unknown) {
      // User cancelled the picker — don't fall through to auto-download
      if (err instanceof DOMException && err.name === 'AbortError') return;
    }
  }

  // Fallback: trigger a download via object URL
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = defaultName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface PDFExportOptions {
  includeScale: boolean;
  includeFretboardDiagrams: boolean;
  paperSize: 'a4' | 'letter';
  orientation: 'portrait' | 'landscape';
}

export const DEFAULT_PDF_OPTIONS: PDFExportOptions = {
  includeScale: true,
  includeFretboardDiagrams: true,
  paperSize: 'a4',
  orientation: 'portrait'
};

export type ProgressCallback = (message: string) => void;

export async function exportSongToPDF(
  song: Song,
  options: PDFExportOptions = DEFAULT_PDF_OPTIONS,
  onProgress?: ProgressCallback,
): Promise<void> {
  onProgress?.('Creating PDF document');
  // Create PDF document
  const pdf = new jsPDF({
    orientation: options.orientation,
    unit: 'mm',
    format: options.paperSize
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  let yPosition = margin;

  // Set up fonts and colors
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(20);
  pdf.setTextColor(40, 44, 52); // Dark gray

  // Add title
  pdf.text(song.name, margin, yPosition);
  yPosition += 15;

  // Add song info
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(12);
  pdf.setTextColor(100, 116, 139); // Gray
  
  const songInfo = formatSongInfo(song.tuning, song.capoSettings, song.bpm);
  pdf.text(`Song Info: ${songInfo}`, margin, yPosition);
  yPosition += 10;
  
  const dateStr = song.updatedAt.toLocaleDateString();
  pdf.text(`Last Updated: ${dateStr}`, margin, yPosition);
  yPosition += 20;

  onProgress?.('Adding song header');

  // Add scale information if requested
  if (options.includeScale) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.setTextColor(40, 44, 52);
    pdf.text('Scale Information', margin, yPosition);
    yPosition += 15;
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    pdf.setTextColor(100, 116, 139);
    
    // Get tuning info
    const tuningNotes = song.tuning.strings.map(s => `${s.note}${s.octave}`).join(' - ');
    pdf.text(`Tuning: ${tuningNotes}`, margin, yPosition);
    yPosition += 8;
    
    if (song.capoSettings.enabled && song.capoSettings.fret > 0) {
      pdf.text(`Capo: Fret ${song.capoSettings.fret}`, margin, yPosition);
      yPosition += 8;
    }
    
    pdf.text(`Tempo: ${song.bpm} BPM`, margin, yPosition);
  yPosition += 8;

  // Scale description and unique notes
  const scaleDescription = describeSongScale(song);
  pdf.text(`Scale: ${scaleDescription}`, margin, yPosition);
  yPosition += 8;

  const uniqueNotes = getUniqueNotesFromSong(song).join(', ');
  pdf.text(`Unique Notes: ${uniqueNotes}`, margin, yPosition);
  yPosition += 12;
  }

  onProgress?.('Writing progressions');

  // Add progressions
  if (song.progressions.length > 0) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.setTextColor(40, 44, 52);
    pdf.text('Chord Progressions', margin, yPosition);
    yPosition += 15;

    for (let i = 0; i < song.progressions.length; i++) {
      const progression = song.progressions[i];
      
      // Check if we need a new page
      if (yPosition > pageHeight - 60) {
        pdf.addPage();
        yPosition = margin;
      }

      // Progression title
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.setTextColor(40, 44, 52);
      pdf.text(`${i + 1}. ${progression.name}`, margin, yPosition);
      yPosition += 12;

      // Progression info
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(11);
      pdf.setTextColor(100, 116, 139);
      
      const chordNames = progression.chords.map(c => c.name).join(' - ');
      pdf.text(`Chords: ${chordNames}`, margin + 5, yPosition);
      yPosition += 8;
      
      const effectiveBpm = progression.bpm || song.bpm;
      pdf.text(`BPM: ${effectiveBpm}${progression.bpm ? ' (custom)' : ''}`, margin + 5, yPosition);
      yPosition += 15;

      // Add chord information
      if (progression.chords.length > 0) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.setTextColor(40, 44, 52);
        pdf.text('Chord Details:', margin + 10, yPosition);
        yPosition += 10;

        for (const chord of progression.chords) {
          // Check if we need a new page
          if (yPosition > pageHeight - 40) {
            pdf.addPage();
            yPosition = margin;
          }

          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(11);
          pdf.setTextColor(59, 130, 246); // Blue
          pdf.text(`${chord.name}:`, margin + 15, yPosition);
          
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(100, 116, 139);
          const notes = chord.notes.join(', ');
          pdf.text(`Notes: ${notes}`, margin + 35, yPosition);
          yPosition += 8;
        }
      }

      yPosition += 15; // Space between progressions
    }
  }

  // Add footer
  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(156, 163, 175); // Light gray
    
    const footerText = `Generated by Chordbook - Page ${i} of ${pageCount}`;
    const textWidth = pdf.getTextWidth(footerText);
    pdf.text(footerText, pageWidth - textWidth - margin, pageHeight - 10);
  }

  onProgress?.('Saving PDF');

  // Save the PDF (native dialog or fallback download)
  const fileName = `${song.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_chordbook.pdf`;
  await savePdfWithPicker(pdf, fileName);
  onProgress?.('Done');
}

// Alternative method using HTML elements for better diagram rendering
export async function exportSongToPDFWithDiagrams(
  song: Song,
  containerElement: HTMLElement,
  options: PDFExportOptions = DEFAULT_PDF_OPTIONS,
  onProgress?: ProgressCallback,
): Promise<void> {
  try {
    onProgress?.('Rendering diagrams to canvas');
    // Create canvas from HTML element
    const canvas = await html2canvas(containerElement, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: containerElement.offsetWidth,
      height: containerElement.offsetHeight,
  logging: true,
      // Ensure colors are inline RGB in clone to avoid unsupported CSS color functions (e.g., oklch)
      onclone: (clonedDoc: Document) => {
        try {
          const win = clonedDoc.defaultView || window;
          // If the root has an id, prefer narrowing to that subtree
          const root = clonedDoc.getElementById('pdf-export-root') || clonedDoc.body;
          if (!root) return;

          // 1) Sanitize <style> tags to strip advanced color functions before parsing
          const styleTags = Array.from(clonedDoc.querySelectorAll('style'));
          let replaceCount = 0;
          styleTags.forEach((tag) => {
            const t = tag.textContent;
            if (!t) return;
            const replaced = t
              .replace(/oklch\([^)]*\)/gi, 'rgb(0,0,0)')
              .replace(/oklab\([^)]*\)/gi, 'rgb(0,0,0)')
              .replace(/(?<![a-z])lch\([^)]*\)/gi, 'rgb(0,0,0)')
              .replace(/(?<![a-z])lab\([^)]*\)/gi, 'rgb(0,0,0)')
              .replace(/color\([^)]*\)/gi, 'rgb(0,0,0)');
            if (replaced !== t) {
              tag.textContent = replaced;
              replaceCount++;
            }
          });
          if (replaceCount > 0) {
            console.warn(`pdf-export: sanitized ${replaceCount} <style> tag(s) to remove advanced color functions`);
          }

          // Helper to normalize CSS colors to rgba() using canvas
          const convCanvas = clonedDoc.createElement('canvas');
          const convCtx = convCanvas.getContext('2d');
          const normalizeColor = (value: string | null): string | null => {
            if (!value) return null;
            // Quick exit for rgb/rgba/transparent
            const v = value.trim();
            if (v === 'transparent' || v.startsWith('rgb')) return v;
            if (!convCtx) return v;
            try {
              convCtx.fillStyle = v;
              const out = convCtx.fillStyle as string;
              // Some browsers may still echo oklch; if so, fall back to transparent to avoid crashes
              if (!out || /oklch|oklab|lch\(|lab\(|color\(/i.test(out)) return 'rgba(0,0,0,0)';
              return out;
            } catch {
              return 'rgba(0,0,0,0)';
            }
          };

          // Known Tailwind color name to RGB fallbacks (subset we use)
          const rgbFallback: Record<string, string> = {
            'var(--tw-prose-body)': 'rgb(55,65,81)',
            'var(--tw-prose-headings)': 'rgb(30,41,59)',
            'var(--tw-prose-bold)': 'rgb(17,24,39)',
            'var(--tw-prose-links)': 'rgb(37,99,235)'
          };

          const all = root.querySelectorAll<HTMLElement>('*');
          const hits: string[] = [];
          const hasUnsupported = (val: string | null | undefined) => !!val && /oklch|oklab|lch\(|lab\(|color\(/i.test(val);
          const sel = (el: Element) => {
            const id = el.id ? `#${el.id}` : '';
            const cls = (el as HTMLElement).className ? '.' + (el as HTMLElement).className.toString().trim().replace(/\s+/g, '.') : '';
            return `${el.tagName.toLowerCase()}${id}${cls}`;
          };
          all.forEach((el) => {
            const cs = win.getComputedStyle(el);
            // Inline commonly used colors
            if (cs && cs.color) {
              const c = rgbFallback[cs.color] || normalizeColor(cs.color) || cs.color;
              el.style.color = c;
            }
            if (cs && cs.backgroundColor) {
              const bgc = rgbFallback[cs.backgroundColor] || normalizeColor(cs.backgroundColor) || cs.backgroundColor;
              el.style.backgroundColor = bgc;
            }

            // Borders
            if (cs.borderTopColor) el.style.borderTopColor = normalizeColor(cs.borderTopColor) || cs.borderTopColor;
            if (cs.borderRightColor) el.style.borderRightColor = normalizeColor(cs.borderRightColor) || cs.borderRightColor;
            if (cs.borderBottomColor) el.style.borderBottomColor = normalizeColor(cs.borderBottomColor) || cs.borderBottomColor;
            if (cs.borderLeftColor) el.style.borderLeftColor = normalizeColor(cs.borderLeftColor) || cs.borderLeftColor;

            if (cs.outlineColor) el.style.outlineColor = normalizeColor(cs.outlineColor) || cs.outlineColor;
            if (cs.caretColor) (el.style as CSSStyleDeclaration).setProperty('caret-color', normalizeColor(cs.caretColor) || cs.caretColor);
            const tdColor = cs.getPropertyValue('text-decoration-color');
            if (tdColor) (el.style as CSSStyleDeclaration).setProperty('text-decoration-color', normalizeColor(tdColor) || tdColor);
            const columnRuleColor = cs.getPropertyValue('column-rule-color');
            if (columnRuleColor) (el.style as CSSStyleDeclaration).setProperty('column-rule-color', normalizeColor(columnRuleColor) || columnRuleColor);
            const accentColor = cs.getPropertyValue('accent-color');
            if (accentColor) (el.style as CSSStyleDeclaration).setProperty('accent-color', normalizeColor(accentColor) || accentColor);

            // SVG fills/strokes if present
            const fill = cs.getPropertyValue('fill');
            const stroke = cs.getPropertyValue('stroke');
            const style = (el as HTMLElement).style as CSSStyleDeclaration;
            if (fill && fill !== 'none') style.setProperty('fill', normalizeColor(fill) || fill);
            if (stroke && stroke !== 'none') style.setProperty('stroke', normalizeColor(stroke) || stroke);

            // Logging: capture first few elements still showing unsupported colors in computed style
            if (hasUnsupported(cs.color)) hits.push(`${sel(el)} color=${cs.color}`);
            if (hasUnsupported(cs.backgroundColor)) hits.push(`${sel(el)} backgroundColor=${cs.backgroundColor}`);
            const bg = cs.getPropertyValue('background');
            if (hasUnsupported(bg)) hits.push(`${sel(el)} background=${bg}`);
            if (hasUnsupported(cs.borderTopColor)) hits.push(`${sel(el)} borderTopColor=${cs.borderTopColor}`);
            if (hasUnsupported(cs.borderRightColor)) hits.push(`${sel(el)} borderRightColor=${cs.borderRightColor}`);
            if (hasUnsupported(cs.borderBottomColor)) hits.push(`${sel(el)} borderBottomColor=${cs.borderBottomColor}`);
            if (hasUnsupported(cs.borderLeftColor)) hits.push(`${sel(el)} borderLeftColor=${cs.borderLeftColor}`);
            if (hasUnsupported(cs.outlineColor)) hits.push(`${sel(el)} outlineColor=${cs.outlineColor}`);
            const bs = cs.getPropertyValue('box-shadow');
            if (hasUnsupported(bs)) hits.push(`${sel(el)} box-shadow=${bs}`);
            const ts = cs.getPropertyValue('text-shadow');
            if (hasUnsupported(ts)) hits.push(`${sel(el)} text-shadow=${ts}`);
            const filt = cs.getPropertyValue('filter');
            if (hasUnsupported(filt)) hits.push(`${sel(el)} filter=${filt}`);
          });

          if (hits.length) {
            console.warn('pdf-export: unsupported color functions detected in clone (showing up to 20):', hits.slice(0, 20));
          }
        } catch (e) {
          // Non-fatal; we'll try rendering anyway
          console.warn('onclone color inlining failed:', e);
        }
      }
    });

    onProgress?.('Building PDF pages');

    // Create PDF
    const pdf = new jsPDF({
      orientation: options.orientation,
      unit: 'px',
      format: [canvas.width, canvas.height]
    });

    // Add the canvas as image to PDF
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);

    // Add additional pages if content is tall
    if (canvas.height > pdf.internal.pageSize.getHeight()) {
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = -pageHeight;

      while (yPosition > -canvas.height) {
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, yPosition, canvas.width, canvas.height);
        yPosition -= pageHeight;
      }
    }

    onProgress?.('Saving PDF');

    // Save the PDF (native dialog or fallback download)
    const fileName = `${song.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_chordbook_diagrams.pdf`;
    await savePdfWithPicker(pdf, fileName);
    onProgress?.('Done');
  } catch (error) {
    console.error('Error generating PDF with diagrams:', error);
    throw new Error('Failed to generate PDF with diagrams');
  }
}
