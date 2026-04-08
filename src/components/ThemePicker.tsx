import { themes, type Theme } from '../lib/theme';

interface ThemePickerProps {
  currentTheme: Theme;
  onThemeChange: (theme: Theme) => void;
}

export default function ThemePicker({ currentTheme, onThemeChange }: ThemePickerProps) {
  return (
    <div className="theme-picker">
      <select
        value={currentTheme.id}
        onChange={e => {
          const t = themes.find(th => th.id === e.target.value);
          if (t) onThemeChange(t);
        }}
        className="theme-picker__select"
        aria-label="Theme"
      >
        {themes.map(theme => (
          <option key={theme.id} value={theme.id}>{theme.name}</option>
        ))}
      </select>
    </div>
  );
}
