import { useState } from 'react';
import type { ChordAnalysis, HarmonicContext } from '../lib/harmonicAnalysis';

interface ChordAnalysisOverlayProps {
  analysis: ChordAnalysis;
  context: HarmonicContext;
}

function fnColor(fn: string): string {
  switch (fn) {
    case 'Tonic': return 'var(--fn-tonic)';
    case 'Subdominant': return 'var(--fn-subdominant)';
    case 'Dominant': return 'var(--fn-dominant)';
    default: return 'var(--analysis)';
  }
}

function fnBg(fn: string): string {
  switch (fn) {
    case 'Tonic': return 'rgba(107,155,210,0.12)';
    case 'Subdominant': return 'rgba(107,181,138,0.12)';
    case 'Dominant': return 'rgba(210,112,112,0.12)';
    default: return 'var(--analysis-subtle)';
  }
}

export default function ChordAnalysisOverlay({ analysis, context }: ChordAnalysisOverlayProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="chord-analysis-overlay"
      onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
    >
      {/* Compact: Roman numeral + function */}
      <div className="chord-analysis-overlay__header">
        <span
          className="chord-analysis-overlay__numeral"
          style={{ color: fnColor(analysis.harmonicFunction) }}
        >
          {analysis.romanNumeral}
        </span>
        <span
          className="chord-analysis-overlay__fn"
          style={{
            background: fnBg(analysis.harmonicFunction),
            color: fnColor(analysis.harmonicFunction),
          }}
        >
          {analysis.functionAbbrev}
        </span>
        {!analysis.isDiatonic && (
          <span className="chord-analysis-overlay__badge">
            {analysis.harmonicFunction === 'Secondary' ? 'Sec' : 'Bor'}
          </span>
        )}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="chord-analysis-overlay__detail">
          {/* Function label */}
          <div className="chord-analysis-overlay__row">
            <span className="chord-analysis-overlay__label">Function</span>
            <span style={{ color: fnColor(analysis.harmonicFunction) }}>
              {analysis.harmonicFunction}
            </span>
          </div>

          {/* Scale degree */}
          <div className="chord-analysis-overlay__row">
            <span className="chord-analysis-overlay__label">Degree</span>
            <span>{analysis.scaleDegree > 0 ? analysis.scaleDegree : '—'} of {context.detectedKey}</span>
          </div>

          {/* Core tones */}
          {analysis.coreTones.length > 0 && (
            <div className="chord-analysis-overlay__row">
              <span className="chord-analysis-overlay__label">Tones</span>
              <div className="chord-analysis-overlay__pills">
                {analysis.coreTones.map((t, i) => (
                  <span key={i} className="chord-analysis-overlay__tone" title={t.role}>
                    {t.note}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Color tones */}
          {analysis.colorTones.length > 0 && (
            <div className="chord-analysis-overlay__row">
              <span className="chord-analysis-overlay__label">Color</span>
              <div className="chord-analysis-overlay__pills">
                {analysis.colorTones.map((t, i) => (
                  <span key={i} className="chord-analysis-overlay__color-tone" title={t.role}>
                    {t.note}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Extensions */}
          {analysis.extensions.length > 0 && (
            <div className="chord-analysis-overlay__row">
              <span className="chord-analysis-overlay__label">Ext</span>
              <div className="chord-analysis-overlay__pills">
                {analysis.extensions.map((e, i) => (
                  <span key={i} className="chord-analysis-overlay__pill">{e}</span>
                ))}
              </div>
            </div>
          )}

          {/* Substitutions */}
          {analysis.substitutions.length > 0 && (
            <div className="chord-analysis-overlay__row">
              <span className="chord-analysis-overlay__label">Subs</span>
              <div className="chord-analysis-overlay__pills">
                {analysis.substitutions.map((s, i) => (
                  <span key={i} className="chord-analysis-overlay__pill">{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Fifth neighbors */}
          <div className="chord-analysis-overlay__row">
            <span className="chord-analysis-overlay__label">5ths</span>
            <span>{analysis.fifthNeighbors.counterclockwise} &larr; &bull; &rarr; {analysis.fifthNeighbors.clockwise}</span>
          </div>
        </div>
      )}
    </div>
  );
}
