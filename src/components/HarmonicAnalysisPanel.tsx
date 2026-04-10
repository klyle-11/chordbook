import type { ProgressionAnalysis } from '../lib/harmonicAnalysis';
import { getCircleOfFifths } from '../lib/harmonicAnalysis';

interface HarmonicAnalysisPanelProps {
  analysis: ProgressionAnalysis | null;
  activeChordIndex?: number;
}

const CIRCLE = getCircleOfFifths();
const CX = 140;
const CY = 140;
const R = 110;
const NOTE_R = 18;

function normalizeNote(n: string): string {
  const map: Record<string, string> = {
    'Cb': 'B', 'B#': 'C', 'Fb': 'E', 'E#': 'F',
    'Gb': 'F#', 'C#': 'Db', 'D#': 'Eb', 'G#': 'Ab', 'A#': 'Bb',
  };
  return map[n] || n;
}

function circleMatch(a: string, b: string): boolean {
  return normalizeNote(a) === normalizeNote(b);
}

function fnColor(fn: string): string {
  switch (fn) {
    case 'T': return 'var(--fn-tonic)';
    case 'SD': return 'var(--fn-subdominant)';
    case 'D': return 'var(--fn-dominant)';
    default: return 'var(--analysis)';
  }
}

export default function HarmonicAnalysisPanel({ analysis, activeChordIndex }: HarmonicAnalysisPanelProps) {
  if (!analysis) return null;

  const { context, chords } = analysis;
  const activeChord = activeChordIndex !== undefined ? chords[activeChordIndex] : null;

  // Which keys on the circle are diatonic
  const diatonicRoots = new Set(
    context.scale.map(n => normalizeNote(n))
  );

  // Build chord movement arrows
  const chordPositions = chords.map(c => {
    const root = c.chordName.match(/^([A-G][#b]?)/)?.[1] || '';
    return CIRCLE.findIndex(k => circleMatch(k, root));
  }).filter(i => i >= 0);

  return (
    <div className="harmonic-panel">
      {/* Key badge */}
      <div className="harmonic-panel__key">
        <span className="harmonic-panel__key-label">{context.detectedKey}</span>
        {context.alternateKeys && context.alternateKeys.length > 0 && (
          <span className="harmonic-panel__alt-keys">
            Also: {context.alternateKeys.join(', ')}
          </span>
        )}
      </div>

      {/* Scale notes */}
      <div className="harmonic-panel__scale">
        {context.scale.map((note, i) => {
          const fn = context.chordsHarmonicFunction[i] || '';
          return (
            <span
              key={i}
              className="harmonic-panel__scale-note"
              style={{ color: fnColor(fn), borderColor: fnColor(fn) }}
            >
              {note}
              <span className="harmonic-panel__grade">{context.grades[i]}</span>
            </span>
          );
        })}
      </div>

      {/* Circle of Fifths SVG */}
      <div className="harmonic-panel__circle-wrap">
        <svg
          viewBox="0 0 280 280"
          className="harmonic-panel__circle"
        >
          {/* Connection lines for chord path */}
          {chordPositions.length > 1 && chordPositions.map((pos, i) => {
            if (i === 0) return null;
            const prev = chordPositions[i - 1];
            const angle1 = (prev * 30 - 90) * (Math.PI / 180);
            const angle2 = (pos * 30 - 90) * (Math.PI / 180);
            const x1 = CX + R * Math.cos(angle1);
            const y1 = CY + R * Math.sin(angle1);
            const x2 = CX + R * Math.cos(angle2);
            const y2 = CY + R * Math.sin(angle2);
            const isActive = activeChordIndex !== undefined && (i === activeChordIndex);
            return (
              <line
                key={`path-${i}`}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="var(--analysis)"
                strokeWidth={isActive ? 2 : 1}
                strokeOpacity={isActive ? 0.6 : 0.2}
                strokeDasharray={isActive ? 'none' : '4 3'}
              />
            );
          })}

          {/* Key circles */}
          {CIRCLE.map((key, i) => {
            const angle = (i * 30 - 90) * (Math.PI / 180);
            const x = CX + R * Math.cos(angle);
            const y = CY + R * Math.sin(angle);
            const isDiatonic = diatonicRoots.has(normalizeNote(key));
            const isTonic = circleMatch(key, context.keyTonic);
            const isActiveRoot = activeChord && circleMatch(key, activeChord.chordName.match(/^([A-G][#b]?)/)?.[1] || '');

            // Heat map: distance from tonic on circle
            const tonicIdx = CIRCLE.findIndex(k => circleMatch(k, context.keyTonic));
            const dist = Math.min(Math.abs(i - tonicIdx), 12 - Math.abs(i - tonicIdx));
            const heatOpacity = Math.max(0.05, 1 - dist * 0.15);

            return (
              <g key={key}>
                {/* Heat glow */}
                <circle
                  cx={x} cy={y} r={NOTE_R + 4}
                  fill="var(--analysis)"
                  opacity={isDiatonic ? heatOpacity * 0.15 : 0}
                />
                {/* Main circle */}
                <circle
                  cx={x} cy={y} r={NOTE_R}
                  fill={isTonic ? 'var(--analysis)' : isActiveRoot ? 'var(--accent)' : isDiatonic ? 'var(--analysis-subtle)' : 'transparent'}
                  stroke={isDiatonic ? 'var(--analysis)' : 'var(--border)'}
                  strokeWidth={isActiveRoot ? 2.5 : isTonic ? 2 : 1}
                  opacity={isDiatonic ? 1 : 0.4}
                />
                {/* Active ring */}
                {isActiveRoot && (
                  <circle
                    cx={x} cy={y} r={NOTE_R + 3}
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth={1.5}
                    opacity={0.6}
                  />
                )}
                {/* Label */}
                <text
                  x={x} y={y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={isTonic ? 12 : 10}
                  fontWeight={isTonic || isActiveRoot ? 700 : isDiatonic ? 600 : 400}
                  fontFamily="var(--font-ui)"
                  fill={isTonic ? '#000' : isActiveRoot ? '#fff' : isDiatonic ? 'var(--text)' : 'var(--text-muted)'}
                >
                  {key}
                </text>
              </g>
            );
          })}

          {/* Center label */}
          <text
            x={CX} y={CY - 6}
            textAnchor="middle"
            fontSize={11}
            fontWeight={700}
            fontFamily="var(--font-ui)"
            fill="var(--text)"
          >
            {context.keyTonic}
          </text>
          <text
            x={CX} y={CY + 8}
            textAnchor="middle"
            fontSize={8}
            fontFamily="var(--font-ui)"
            fill="var(--text-muted)"
          >
            {context.keyType}
          </text>
        </svg>
      </div>

      {/* Progression movement */}
      {chords.length > 0 && (
        <div className="harmonic-panel__movement">
          {chords.map((c, i) => (
            <span key={i} className="harmonic-panel__move-item">
              <span
                className="harmonic-panel__move-numeral"
                style={{
                  color: fnColor(c.functionAbbrev),
                  fontWeight: activeChordIndex === i ? 700 : 500,
                  opacity: activeChordIndex === i ? 1 : 0.7,
                }}
              >
                {c.romanNumeral}
              </span>
              {i < chords.length - 1 && (
                <span className="harmonic-panel__move-arrow">&rarr;</span>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
