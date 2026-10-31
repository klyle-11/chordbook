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
    glow: string;
    glowSubtle: string;
    fretMarker: string;
    fretMarkerBorder: string;
    fretMarkerOpen: string;
    fretMarkerOpenBorder: string;
    fretString: string;
    fretDivider: string;
    fretDividerMuted: string;
    analysis: string;
    analysisSubtle: string;
    fnTonic: string;
    fnSubdominant: string;
    fnDominant: string;
  };
}


/** Key colours of a light theme; everything else is derived in lightTheme(). */
interface LightPalette {
  bg: string;            // page
  bgSecondary: string;   // panels, header rows
  bgCard: string;        // chord cards, progressions
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderHover: string;
  accent: string;
  accentHover: string;
  accentSubtle: string;
  tagBg: string;
  tagText: string;
  lead: string;          // lead-note highlight — contrasts the accent
  glow: string;          // selection / capo / next-chord highlight
  fretDivider: string;
}

function rgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

function lightTheme(id: string, name: string, p: LightPalette): Theme {
  return {
    id,
    name,
    colors: {
      bg: p.bg,
      bgSecondary: p.bgSecondary,
      bgCard: p.bgCard,
      bgCardHover: p.bg,
      text: p.text,
      textSecondary: p.textSecondary,
      textMuted: p.textMuted,
      border: p.border,
      borderHover: p.borderHover,
      accent: p.accent,
      accentHover: p.accentHover,
      accentSubtle: p.accentSubtle,
      danger: '#dc2626',
      dangerSubtle: '#fef2f2',
      success: '#16a34a',
      successSubtle: '#f0fdf4',
      inputBg: p.bgCard,
      inputBorder: p.border,
      overlayBg: rgba(p.text, 0.35),
      sliderTrack: p.border,
      tagBg: p.tagBg,
      tagText: p.tagText,
      cardText: p.text,
      cardTextSecondary: p.textSecondary,
      cardTextMuted: p.textMuted,
      lead: p.lead,
      leadSubtle: rgba(p.lead, 0.18),
      glow: p.glow,
      glowSubtle: rgba(p.glow, 0.25),
      fretMarker: p.accentSubtle,
      fretMarkerBorder: p.borderHover,
      fretMarkerOpen: p.accentSubtle,
      fretMarkerOpenBorder: p.borderHover,
      fretString: p.textMuted,
      fretDivider: p.fretDivider,
      fretDividerMuted: p.border,
      analysis: '#9ca3af',
      analysisSubtle: 'rgba(156,163,175,0.14)',
      fnTonic: '#6b9bd2',
      fnSubdominant: '#6bb58a',
      fnDominant: '#d27070',
    },
  };
}

const lightThemes: Theme[] = [
  lightTheme('lime', 'Lime', {
    bg: '#f7fbea', bgSecondary: '#eef6d6', bgCard: '#fdfff6',
    text: '#26330f', textSecondary: '#4d5f25', textMuted: '#98a878',
    border: '#dbe8b8', borderHover: '#a3c45a',
    accent: '#65a30d', accentHover: '#4d7c0f', accentSubtle: '#ecfccb',
    tagBg: '#e4f2c4', tagText: '#4d6a14',
    lead: '#8b5cf6', glow: '#0d9488', fretDivider: '#c5d99a',
  }),
  lightTheme('lavender', 'Lavender', {
    bg: '#f7f5fc', bgSecondary: '#eeeaf8', bgCard: '#fdfcff',
    text: '#262048', textSecondary: '#4f4880', textMuted: '#a39fc4',
    border: '#e0dbf2', borderHover: '#9d95d8',
    accent: '#5b5bd6', accentHover: '#4338ca', accentSubtle: '#e8e6fc',
    tagBg: '#ebe7f9', tagText: '#534c99',
    lead: '#e0729b', glow: '#8b5cf6', fretDivider: '#cbc4ea',
  }),
  lightTheme('sky', 'Sky', {
    bg: '#f8f6f1', bgSecondary: '#eef2f4', bgCard: '#fffefb',
    text: '#1f2d3a', textSecondary: '#4a5d6e', textMuted: '#9aa9b5',
    border: '#dde5ea', borderHover: '#8fb8d4',
    accent: '#2b86c5', accentHover: '#1d6aa3', accentSubtle: '#e3f1fa',
    tagBg: '#e8eef1', tagText: '#3f6784',
    lead: '#d98c4a', glow: '#0ea5e9', fretDivider: '#c8d5dd',
  }),
  lightTheme('citrus', 'Citrus', {
    bg: '#fffbeb', bgSecondary: '#fef3c7', bgCard: '#fffef7',
    text: '#3a2a06', textSecondary: '#6e5412', textMuted: '#bfa565',
    border: '#f6e3a1', borderHover: '#fb923c',
    accent: '#f97316', accentHover: '#ea580c', accentSubtle: '#ffedd5',
    tagBg: '#fdf0c2', tagText: '#8a5a00',
    lead: '#0ea5e9', glow: '#7c3aed', fretDivider: '#ecd48a',
  }),
  lightTheme('blossom', 'Blossom', {
    bg: '#fff5f8', bgSecondary: '#fde8ef', bgCard: '#fffafc',
    text: '#3b1526', textSecondary: '#7a3556', textMuted: '#c595ab',
    border: '#f7d4e1', borderHover: '#f472b6',
    accent: '#ec4899', accentHover: '#db2777', accentSubtle: '#fce7f3',
    tagBg: '#fbe1eb', tagText: '#9d2b5f',
    lead: '#14b8a6', glow: '#a855f7', fretDivider: '#f0bcd0',
  }),
];

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
      glow: '#6366f1',
      glowSubtle: 'rgba(99,102,241,0.25)',
      fretMarker: '#d4a050',
      fretMarkerBorder: '#b07828',
      fretMarkerOpen: '#d4a050',
      fretMarkerOpenBorder: '#b07828',
      fretString: '#9a8a6a',
      fretDivider: '#d4c4a8',
      fretDividerMuted: '#e8dcc8',
      analysis: '#9ca3af',
      analysisSubtle: 'rgba(156,163,175,0.14)',
      fnTonic: '#6b9bd2',
      fnSubdominant: '#6bb58a',
      fnDominant: '#d27070',
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
      glow: '#60a5fa',
      glowSubtle: 'rgba(96,165,250,0.3)',
      fretMarker: '#e0a830',
      fretMarkerBorder: '#c08010',
      fretMarkerOpen: '#e0a830',
      fretMarkerOpenBorder: '#c08010',
      fretString: '#737373',
      fretDivider: '#525252',
      fretDividerMuted: '#404040',
      analysis: '#c0c7d0',
      analysisSubtle: 'rgba(192,199,208,0.12)',
      fnTonic: '#7bafd4',
      fnSubdominant: '#6bc49a',
      fnDominant: '#e07070',
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
      glow: '#a78bfa',
      glowSubtle: 'rgba(167,139,250,0.3)',
      fretMarker: '#b8b0d8',
      fretMarkerBorder: '#9890b8',
      fretMarkerOpen: '#b8b0d8',
      fretMarkerOpenBorder: '#9890b8',
      fretString: '#5e587a',
      fretDivider: '#4a4466',
      fretDividerMuted: '#332e48',
      analysis: '#c4c8d8',
      analysisSubtle: 'rgba(196,200,216,0.12)',
      fnTonic: '#7ba8d8',
      fnSubdominant: '#6bc49a',
      fnDominant: '#d87878',
    },
  },
  ...lightThemes,
];

const THEME_KEY = 'selectedTheme';

// Retired themes → closest replacement, so saved choices still resolve
const LEGACY_THEME_IDS: Record<string, string> = { ocean: 'sky', forest: 'lime' };

export function getThemeById(id: string): Theme {
  const resolved = LEGACY_THEME_IDS[id] ?? id;
  return themes.find(t => t.id === resolved) || themes[0];
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
