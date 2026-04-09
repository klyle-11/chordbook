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
    cardText: string;
    cardTextSecondary: string;
    cardTextMuted: string;
    lead: string;
    leadSubtle: string;
  };
}

export const themes: Theme[] = [
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
      cardText: '#3b2f1e',
      cardTextSecondary: '#6b5a43',
      cardTextMuted: '#b8a48c',
      lead: '#7c8cf8',
      leadSubtle: 'rgba(124,140,248,0.18)',
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
      cardText: '#e5e5e5',
      cardTextSecondary: '#a3a3a3',
      cardTextMuted: '#636363',
      lead: '#86efac',
      leadSubtle: 'rgba(134,239,172,0.18)',
    },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    colors: {
      bg: '#1d163e',
      bgSecondary: '#150f30',
      bgCard: '#faf7f0',
      bgCardHover: '#f0ebe0',
      text: '#e8e4f0',
      textSecondary: '#b8b0d0',
      textMuted: '#6e6494',
      border: '#2e2558',
      borderHover: '#7b6faa',
      accent: '#818cf8',
      accentHover: '#a5b4fc',
      accentSubtle: '#252050',
      danger: '#fb7185',
      dangerSubtle: '#301525',
      success: '#34d399',
      successSubtle: '#152520',
      inputBg: '#faf7f0',
      inputBorder: '#d4cfc4',
      overlayBg: 'rgba(15,10,35,0.7)',
      sliderTrack: '#2e2558',
      tagBg: '#252050',
      tagText: '#c7c0e8',
      cardText: '#1a1335',
      cardTextSecondary: '#3d3566',
      cardTextMuted: '#8b82b0',
      lead: '#86efac',
      leadSubtle: 'rgba(134,239,172,0.18)',
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    colors: {
      bg: '#1b3328',
      bgSecondary: '#142820',
      bgCard: '#f8f5ed',
      bgCardHover: '#eee9de',
      text: '#dce8e0',
      textSecondary: '#a4c4ae',
      textMuted: '#5e8a6e',
      border: '#264a38',
      borderHover: '#4a7c5e',
      accent: '#5eaa7d',
      accentHover: '#7ec49a',
      accentSubtle: '#1e3d2e',
      danger: '#fb7185',
      dangerSubtle: '#2d1520',
      success: '#5eaa7d',
      successSubtle: '#1a3528',
      inputBg: '#f8f5ed',
      inputBorder: '#cfc9bc',
      overlayBg: 'rgba(14,28,22,0.7)',
      sliderTrack: '#264a38',
      tagBg: '#1e3d2e',
      tagText: '#a4c4ae',
      cardText: '#1b2e24',
      cardTextSecondary: '#3a5c48',
      cardTextMuted: '#7d9a89',
      lead: '#b4a6f8',
      leadSubtle: 'rgba(180,166,248,0.18)',
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
      cardText: '#e2dff0',
      cardTextSecondary: '#a9a4c0',
      cardTextMuted: '#5e587a',
      lead: '#86efac',
      leadSubtle: 'rgba(134,239,172,0.18)',
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
