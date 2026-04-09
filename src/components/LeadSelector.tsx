import { useState } from 'react';
import type { Lead } from '../types/lead';
import type { Tuning } from '../lib/tunings';
import { TUNINGS } from '../lib/tunings';

interface LeadSelectorProps {
  songLeadIds: string[];
  allLeads: Lead[];
  activeLeadId: string | null;
  currentTuning: Tuning;
  onActivateLead: (leadId: string | null) => void;
  onAssociateLead: (leadId: string) => void;
  onDissociateLead: (leadId: string) => void;
  onNewLead: () => void;
  onClose: () => void;
}

export default function LeadSelector({
  songLeadIds,
  allLeads,
  activeLeadId,
  currentTuning,
  onActivateLead,
  onAssociateLead,
  onDissociateLead,
  onNewLead,
  onClose,
}: LeadSelectorProps) {
  const [showGlobalBank, setShowGlobalBank] = useState(false);

  const songLeads = allLeads.filter(l => songLeadIds.includes(l.id));
  const globalLeads = allLeads.filter(l => !songLeadIds.includes(l.id));
  const globalByTuning = globalLeads.reduce<Record<string, Lead[]>>((acc, lead) => {
    const key = lead.tuningId;
    if (!acc[key]) acc[key] = [];
    acc[key].push(lead);
    return acc;
  }, {});

  const getTuningName = (tuningId: string): string => {
    const t = TUNINGS.find(t => t.id === tuningId);
    return t ? t.name.split(' (')[0] : tuningId;
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="absolute left-0 top-full mt-1 z-50 w-72 rounded-lg shadow-lg overflow-hidden animate-[fadeIn_0.12s_ease-out]"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        {/* Song leads */}
        <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
            Song leads
          </div>
          {songLeads.length === 0 ? (
            <div className="text-xs py-1" style={{ color: 'var(--text-muted)' }}>
              No leads added to this song
            </div>
          ) : (
            <div className="space-y-0.5">
              {songLeads.map(lead => (
                <div
                  key={lead.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors"
                  style={{
                    background: activeLeadId === lead.id ? 'var(--lead-subtle)' : undefined,
                  }}
                  onClick={() => onActivateLead(activeLeadId === lead.id ? null : lead.id)}
                >
                  <span className="w-4 text-center text-xs" style={{ color: 'var(--lead)' }}>
                    {activeLeadId === lead.id ? '\u2713' : ''}
                  </span>
                  <span className="flex-1 text-sm truncate" style={{ color: 'var(--text)' }}>
                    {lead.name}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {lead.notes.length}n
                  </span>
                  <button
                    className="w-5 h-5 rounded flex items-center justify-center text-xs opacity-50 hover:opacity-100 transition-opacity"
                    style={{ color: 'var(--danger)' }}
                    onClick={(e) => { e.stopPropagation(); onDissociateLead(lead.id); }}
                    title="Remove from song"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Global bank toggle */}
        <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
          <button
            className="w-full text-left text-xs font-medium flex items-center justify-between py-1 transition-colors hover:opacity-80"
            style={{ color: 'var(--text-secondary)' }}
            onClick={() => setShowGlobalBank(!showGlobalBank)}
          >
            <span>Global lead bank ({globalLeads.length})</span>
            <span className="text-xs">{showGlobalBank ? '\u25B2' : '\u25BC'}</span>
          </button>

          {showGlobalBank && globalLeads.length > 0 && (
            <div className="mt-1 space-y-2 max-h-48 overflow-y-auto">
              {Object.entries(globalByTuning).map(([tuningId, leads]) => (
                <div key={tuningId}>
                  <div className="text-xs px-1 py-0.5" style={{ color: 'var(--text-muted)' }}>
                    {getTuningName(tuningId)}
                    {tuningId !== currentTuning.id && (
                      <span className="ml-1 opacity-60">(different tuning)</span>
                    )}
                  </div>
                  {leads.map(lead => (
                    <div
                      key={lead.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors"
                      style={{
                        background: activeLeadId === lead.id ? 'var(--lead-subtle)' : undefined,
                      }}
                      onClick={() => onActivateLead(activeLeadId === lead.id ? null : lead.id)}
                    >
                      <span className="w-4 text-center text-xs" style={{ color: 'var(--lead)' }}>
                        {activeLeadId === lead.id ? '\u2713' : ''}
                      </span>
                      <span className="flex-1 text-sm truncate" style={{ color: 'var(--text)' }}>
                        {lead.name}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {lead.notes.length}n
                      </span>
                      <button
                        className="text-xs px-1.5 py-0.5 rounded transition-colors hover:opacity-80"
                        style={{ color: 'var(--lead)', border: '1px solid var(--lead)' }}
                        onClick={(e) => { e.stopPropagation(); onAssociateLead(lead.id); }}
                        title="Add to current song"
                      >
                        +
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {showGlobalBank && globalLeads.length === 0 && (
            <div className="text-xs py-1" style={{ color: 'var(--text-muted)' }}>
              No other leads available
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-3 py-2">
          <button
            className="w-full text-left text-sm px-2 py-1.5 rounded transition-colors hover:opacity-80"
            style={{ color: 'var(--lead)' }}
            onClick={() => { onClose(); onNewLead(); }}
          >
            + New lead
          </button>
        </div>
      </div>
    </>
  );
}
