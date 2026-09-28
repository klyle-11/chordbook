import { useEffect, useRef, useState } from 'react';
import type { SongLink } from '../types/song';

interface SongLinksProps {
  links: SongLink[];
  onChange: (links: SongLink[]) => void;
}

/** Accepts "example.com/tab" too; only http(s) URLs are allowed. */
function parseUrl(raw: string): URL | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

function displayLabel(link: SongLink): string {
  if (link.label) return link.label;
  try {
    const url = new URL(link.url);
    return url.hostname.replace(/^www\./, '') + (url.pathname.length > 1 ? url.pathname : '');
  } catch {
    return link.url;
  }
}

/** Link icon next to the song title; opens a small popover to view and add tab/notation links. */
export default function SongLinks({ links, onChange }: SongLinksProps) {
  const [open, setOpen] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [labelInput, setLabelInput] = useState('');
  const [error, setError] = useState('');
  const urlRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) urlRef.current?.focus(); }, [open]);

  function close() {
    setOpen(false);
    setUrlInput('');
    setLabelInput('');
    setError('');
  }

  function handleAdd() {
    const url = parseUrl(urlInput);
    if (!url) {
      setError('Enter a valid http(s) link');
      return;
    }
    onChange([...links, {
      id: 'link-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      url: url.href,
      label: labelInput.trim() || undefined,
    }]);
    setUrlInput('');
    setLabelInput('');
    setError('');
    urlRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); handleAdd(); }
    else if (e.key === 'Escape') close();
  }

  return (
    <span className="song-links">
      <button
        onClick={() => (open ? close() : setOpen(true))}
        className="song-links__icon"
        data-active={open || links.length > 0}
        title={links.length > 0 ? `${links.length} link${links.length !== 1 ? 's' : ''} — tabs & notation` : 'Add links to tabs & notation'}
        aria-label="Song links"
        aria-expanded={open}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 007.07 0l3-3a5 5 0 00-7.07-7.07l-1.5 1.5" />
          <path d="M14 11a5 5 0 00-7.07 0l-3 3a5 5 0 007.07 7.07l1.5-1.5" />
        </svg>
        {links.length > 0 && <span className="song-links__count">{links.length}</span>}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onMouseDown={close} />
          <div className="song-links__popover" role="dialog" aria-label="Song links" onKeyDown={e => { if (e.key === 'Escape') close(); }}>
            {links.length > 0 ? (
              <ul className="song-links__list">
                {links.map(link => (
                  <li key={link.id} className="song-links__item">
                    <a href={link.url} target="_blank" rel="noopener noreferrer" title={link.url} className="song-links__link">
                      {displayLabel(link)}
                    </a>
                    <button
                      onClick={() => onChange(links.filter(l => l.id !== link.id))}
                      className="song-links__remove"
                      aria-label={`Remove ${displayLabel(link)}`}
                      title="Remove"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="song-links__empty">No links yet — add tabs, sheet music, videos…</div>
            )}

            <div className="song-links__form">
              <input
                ref={urlRef}
                type="url"
                value={urlInput}
                onChange={e => { setUrlInput(e.target.value); setError(''); }}
                onKeyDown={handleKeyDown}
                placeholder="https://…"
                className="song-links__input"
                aria-label="Link URL"
              />
              <input
                type="text"
                value={labelInput}
                onChange={e => setLabelInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Label (optional)"
                className="song-links__input"
                aria-label="Link label"
              />
              <button onClick={handleAdd} className="song-links__add" disabled={!urlInput.trim()}>Add</button>
            </div>
            {error && <div className="song-links__error">{error}</div>}
          </div>
        </>
      )}
    </span>
  );
}
