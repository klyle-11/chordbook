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
