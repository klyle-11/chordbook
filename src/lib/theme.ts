import { db } from './db';

export interface Theme {
  id: string;
  name: string;
  colors: {
    bg: string;
    bgSecondary: string;
    bgCard: string;
    bgCardHover: string;
    text: string;
    textSecondary: string;
    textMuted: string;
    border: string;
    borderHover: string;
    accent: string;
    accentHover: string;
    accentSubtle: string;
    danger: string;
    dangerSubtle: string;
    success: string;
    successSubtle: string;
    inputBg: string;
    inputBorder: string;
    overlayBg: string;
    sliderTrack: string;
    tagBg: string;
    tagText: string;
  };
}

export const themes: Theme[] = [
  {
    id: 'light',
    name: 'Light',
    colors: {
      bg: '#fafaf9',
      bgSecondary: '#f5f5f4',
      bgCard: '#ffffff',
      bgCardHover: '#fafaf9',
      text: '#1c1917',
      textSecondary: '#44403c',
      textMuted: '#a8a29e',
      border: '#e7e5e4',
      borderHover: '#a3c4f3',
      accent: '#2563eb',
      accentHover: '#1d4ed8',
      accentSubtle: '#eff6ff',
      danger: '#dc2626',
      dangerSubtle: '#fef2f2',
      success: '#16a34a',
      successSubtle: '#f0fdf4',
      inputBg: '#ffffff',
      inputBorder: '#d6d3d1',
      overlayBg: 'rgba(0,0,0,0.4)',
      sliderTrack: '#e7e5e4',
      tagBg: '#f5f5f4',
      tagText: '#57534e',
    },
  },
  {
    id: 'dark',
    name: 'Dark',
    colors: {
      bg: '#171717',
      bgSecondary: '#1e1e1e',
      bgCard: '#262626',
      bgCardHover: '#2e2e2e',
      text: '#e5e5e5',
      textSecondary: '#a3a3a3',
      textMuted: '#636363',
      border: '#363636',
      borderHover: '#525252',
      accent: '#60a5fa',
      accentHover: '#93c5fd',
      accentSubtle: '#1e293b',
      danger: '#f87171',
      dangerSubtle: '#2d1b1b',
      success: '#4ade80',
      successSubtle: '#1a2e1a',
      inputBg: '#2a2a2a',
      inputBorder: '#404040',
      overlayBg: 'rgba(0,0,0,0.6)',
      sliderTrack: '#404040',
      tagBg: '#333333',
      tagText: '#a3a3a3',
    },
  },
  {
    id: 'warm',
    name: 'Warm',
    colors: {
      bg: '#fdf8f0',
      bgSecondary: '#f9f0e3',
      bgCard: '#fffdf9',
      bgCardHover: '#fdf8f0',
      text: '#3b2f1e',
      textSecondary: '#6b5a43',
      textMuted: '#b8a48c',
      border: '#e8dcc8',
      borderHover: '#c9a96e',
      accent: '#b45309',
      accentHover: '#92400e',
      accentSubtle: '#fef3c7',
      danger: '#c2410c',
      dangerSubtle: '#fff1e6',
      success: '#4d7c0f',
      successSubtle: '#f7fee7',
      inputBg: '#fffdf9',
      inputBorder: '#d4c4a8',
      overlayBg: 'rgba(59,47,30,0.4)',
      sliderTrack: '#e8dcc8',
      tagBg: '#f5ead6',
      tagText: '#78673e',
    },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    colors: {
      bg: '#f0f7ff',
      bgSecondary: '#e1effe',
      bgCard: '#f8fbff',
      bgCardHover: '#f0f7ff',
      text: '#0c2d48',
      textSecondary: '#2a5f8f',
      textMuted: '#7facc8',
      border: '#bcd8f1',
      borderHover: '#6ba3d6',
      accent: '#0369a1',
      accentHover: '#075985',
      accentSubtle: '#e0f2fe',
      danger: '#b91c1c',
      dangerSubtle: '#fef2f2',
      success: '#15803d',
      successSubtle: '#f0fdf4',
      inputBg: '#f8fbff',
      inputBorder: '#a5cceb',
      overlayBg: 'rgba(12,45,72,0.4)',
      sliderTrack: '#bcd8f1',
      tagBg: '#dbeafe',
      tagText: '#1e5a8a',
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    colors: {
      bg: '#f2f7f2',
      bgSecondary: '#e5efe5',
      bgCard: '#f9fcf9',
      bgCardHover: '#f2f7f2',
      text: '#1a2e1a',
      textSecondary: '#3d5c3d',
      textMuted: '#8aab8a',
      border: '#c2d9c2',
      borderHover: '#7ab37a',
      accent: '#15803d',
      accentHover: '#166534',
      accentSubtle: '#dcfce7',
      danger: '#b91c1c',
      dangerSubtle: '#fef2f2',
      success: '#15803d',
      successSubtle: '#f0fdf4',
      inputBg: '#f9fcf9',
      inputBorder: '#a8cca8',
      overlayBg: 'rgba(26,46,26,0.4)',
      sliderTrack: '#c2d9c2',
      tagBg: '#e0f0e0',
      tagText: '#2d5a2d',
    },
  },
  {
    id: 'midnight',
    name: 'Midnight',
    colors: {
      bg: '#13111c',
      bgSecondary: '#1a1726',
      bgCard: '#221e30',
      bgCardHover: '#2a2540',
      text: '#e2dff0',
      textSecondary: '#a9a4c0',
      textMuted: '#5e587a',
      border: '#332e48',
      borderHover: '#4a4466',
      accent: '#a78bfa',
      accentHover: '#c4b5fd',
      accentSubtle: '#1e1636',
      danger: '#fb7185',
      dangerSubtle: '#2d1520',
      success: '#4ade80',
      successSubtle: '#162016',
      inputBg: '#1e1a2a',
      inputBorder: '#3d3756',
      overlayBg: 'rgba(10,8,16,0.6)',
      sliderTrack: '#332e48',
      tagBg: '#2a2540',
      tagText: '#a9a4c0',
    },
  },
];

const THEME_KEY = 'selectedTheme';

export function getThemeById(id: string): Theme {
  return themes.find(t => t.id === id) || themes[0];
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(theme.colors)) {
    root.style.setProperty(`--${camelToKebab(key)}`, value);
  }
  root.setAttribute('data-theme', theme.id);
}

function camelToKebab(str: string): string {
  return str.replace(/([A-Z])/g, '-$1').toLowerCase();
}

export async function loadTheme(): Promise<Theme> {
  try {
    const entry = await db.appState.get(THEME_KEY);
    if (entry) {
      return getThemeById(entry.value);
    }
  } catch (error) {
    console.error('Error loading theme:', error);
  }
  return themes[0];
}

export async function saveTheme(themeId: string): Promise<void> {
  try {
    await db.appState.put({ key: THEME_KEY, value: themeId });
  } catch (error) {
    console.error('Error saving theme:', error);
  }
}
