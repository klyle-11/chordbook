import { useState } from 'react';
import { themes, type Theme } from '../lib/theme';

interface ThemePickerProps {
  currentTheme: Theme;
  onThemeChange: (theme: Theme) => void;
}

export default function ThemePicker({ currentTheme, onThemeChange }: ThemePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors"
        style={{
          background: 'var(--bg-card)',
          borderColor: 'var(--border)',
          color: 'var(--text-secondary)',
        }}
        title="Change theme"
      >
        <div
          className="w-4 h-4 rounded-full border"
          style={{
            background: currentTheme.colors.accent,
            borderColor: currentTheme.colors.border,
          }}
        />
        <span className="text-sm font-medium hidden sm:inline">{currentTheme.name}</span>
        <svg className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div
            className="absolute right-0 top-full mt-2 z-50 rounded-xl shadow-lg border p-2 min-w-[200px]"
            style={{
              background: 'var(--bg-card)',
              borderColor: 'var(--border)',
            }}
          >
            <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Theme
            </p>
            {themes.map(theme => (
              <button
                key={theme.id}
                onClick={() => {
                  onThemeChange(theme);
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors"
                style={{
                  background: theme.id === currentTheme.id ? 'var(--accent-subtle)' : 'transparent',
                  color: 'var(--text)',
                }}
              >
                <div className="flex gap-1">
                  <div className="w-4 h-4 rounded-full" style={{ background: theme.colors.bg, border: `1px solid ${theme.colors.border}` }} />
                  <div className="w-4 h-4 rounded-full" style={{ background: theme.colors.accent }} />
                  <div className="w-4 h-4 rounded-full" style={{ background: theme.colors.bgCard, border: `1px solid ${theme.colors.border}` }} />
                </div>
                <span className="text-sm font-medium">{theme.name}</span>
                {theme.id === currentTheme.id && (
                  <svg className="w-4 h-4 ml-auto" style={{ color: 'var(--accent)' }} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
