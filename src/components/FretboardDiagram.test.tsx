import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import FretboardDiagram from './FretboardDiagram';
import { TUNINGS } from '../lib/music/tunings';

describe('FretboardDiagram secondary notes', () => {
  it('renders mode-only tones faded without covering chord or lead tones', () => {
    const html = renderToString(
      <FretboardDiagram
        compact
        chordNotes={['C', 'E', 'G']}
        secondaryNotes={['C', 'D', 'E', 'F', 'G', 'A', 'B']}
        secondaryLabel="Mode · C Ionian"
        activeLeadNotes={['D']}
        tuning={TUNINGS[0]}
        capoSettings={{ enabled: false, fret: 0 }}
      />
    );

    expect(html).toContain('Mode · C Ionian: F');
    expect(html).toContain('opacity:0.3');
    expect(html).not.toContain('Mode · C Ionian: C');
    expect(html).not.toContain('Mode · C Ionian: D');
  });
});

describe('FretboardDiagram row height', () => {
  const render = (rowHeight?: number) => renderToString(
    <FretboardDiagram
      compact
      rowHeight={rowHeight}
      chordNotes={['C', 'E', 'G']}
      tuning={TUNINGS[0]}
      capoSettings={{ enabled: false, fret: 0 }}
    />
  );

  it('scales string rows and note markers together', () => {
    const small = render(16);
    expect(small).toContain('height:16px');
    expect(small).toContain('width:14px;height:14px;font-size:7px');

    const large = render(32);
    expect(large).toContain('height:32px');
    expect(large).toContain('width:30px;height:30px;font-size:15px');
  });

  it('keeps the default responsive size when no row height is given', () => {
    const html = render();
    expect(html).toContain('space-y-0.5 sm:space-y-1');
    expect(html).not.toContain('font-size:');
  });
});
