import React from 'react';

export interface OptionColorTheme {
  bg: string;
  fg: string;
  border: string;
}

export interface OptionColorPair {
  light: OptionColorTheme;
  dark: OptionColorTheme;
}

export const APPLE_COLORS = [
  { name: 'Default', hex: '#64748b' },
  { name: 'Gray', hex: '#6b7280' },
  { name: 'Brown', hex: '#92400e' },
  { name: 'Orange', hex: '#ea580c' },
  { name: 'Yellow', hex: '#ca8a04' },
  { name: 'Green', hex: '#16a34a' },
  { name: 'Teal', hex: '#0d9488' },
  { name: 'Blue', hex: '#0284c7' },
  { name: 'Indigo', hex: '#4f46e5' },
  { name: 'Purple', hex: '#9333ea' },
  { name: 'Pink', hex: '#db2777' },
  { name: 'Red', hex: '#dc2626' },
];

export const AUTO_COLORS = [
  '#0284c7', // Blue
  '#9333ea', // Purple
  '#db2777', // Pink
  '#ea580c', // Orange
  '#16a34a', // Green
  '#0d9488', // Teal
  '#4f46e5', // Indigo
  '#ca8a04', // Yellow
  '#64748b', // Slate
];

// Notion & Linear inspired accessible color pairs for both light and dark mode
const PRESET_COLOR_MAP: Record<string, OptionColorPair> = {
  // Default / Slate / Gray
  '#64748b': {
    light: { bg: '#f1f1ef', fg: '#37352f', border: 'rgba(55, 53, 47, 0.09)' },
    dark: { bg: 'rgba(255, 255, 255, 0.08)', fg: '#d4d4d8', border: 'rgba(255, 255, 255, 0.12)' },
  },
  '#6b7280': {
    light: { bg: '#f1f1ef', fg: '#37352f', border: 'rgba(55, 53, 47, 0.09)' },
    dark: { bg: 'rgba(255, 255, 255, 0.08)', fg: '#d4d4d8', border: 'rgba(255, 255, 255, 0.12)' },
  },
  gray: {
    light: { bg: '#f1f1ef', fg: '#37352f', border: 'rgba(55, 53, 47, 0.09)' },
    dark: { bg: 'rgba(255, 255, 255, 0.08)', fg: '#d4d4d8', border: 'rgba(255, 255, 255, 0.12)' },
  },
  grey: {
    light: { bg: '#f1f1ef', fg: '#37352f', border: 'rgba(55, 53, 47, 0.09)' },
    dark: { bg: 'rgba(255, 255, 255, 0.08)', fg: '#d4d4d8', border: 'rgba(255, 255, 255, 0.12)' },
  },
  slate: {
    light: { bg: '#f1f1ef', fg: '#37352f', border: 'rgba(55, 53, 47, 0.09)' },
    dark: { bg: 'rgba(255, 255, 255, 0.08)', fg: '#d4d4d8', border: 'rgba(255, 255, 255, 0.12)' },
  },
  default: {
    light: { bg: '#f1f1ef', fg: '#37352f', border: 'rgba(55, 53, 47, 0.09)' },
    dark: { bg: 'rgba(255, 255, 255, 0.08)', fg: '#d4d4d8', border: 'rgba(255, 255, 255, 0.12)' },
  },

  // Brown
  '#92400e': {
    light: { bg: '#f4eeee', fg: '#64473a', border: 'rgba(100, 71, 58, 0.15)' },
    dark: { bg: '#3b2519', fg: '#e2b399', border: 'rgba(226, 179, 153, 0.22)' },
  },
  brown: {
    light: { bg: '#f4eeee', fg: '#64473a', border: 'rgba(100, 71, 58, 0.15)' },
    dark: { bg: '#3b2519', fg: '#e2b399', border: 'rgba(226, 179, 153, 0.22)' },
  },

  // Blue
  '#0284c7': {
    light: { bg: '#e7f3f8', fg: '#1d6c99', border: 'rgba(29, 108, 153, 0.18)' },
    dark: { bg: '#103850', fg: '#7dc7f0', border: 'rgba(125, 199, 240, 0.22)' },
  },
  '#007aff': {
    light: { bg: '#e7f3f8', fg: '#1d6c99', border: 'rgba(29, 108, 153, 0.18)' },
    dark: { bg: '#103850', fg: '#7dc7f0', border: 'rgba(125, 199, 240, 0.22)' },
  },
  '#3b82f6': {
    light: { bg: '#e7f3f8', fg: '#1d6c99', border: 'rgba(29, 108, 153, 0.18)' },
    dark: { bg: '#103850', fg: '#7dc7f0', border: 'rgba(125, 199, 240, 0.22)' },
  },
  blue: {
    light: { bg: '#e7f3f8', fg: '#1d6c99', border: 'rgba(29, 108, 153, 0.18)' },
    dark: { bg: '#103850', fg: '#7dc7f0', border: 'rgba(125, 199, 240, 0.22)' },
  },

  // Purple
  '#9333ea': {
    light: { bg: '#f6f3f9', fg: '#6940a5', border: 'rgba(105, 64, 165, 0.18)' },
    dark: { bg: '#331a50', fg: '#cba7f5', border: 'rgba(203, 167, 245, 0.22)' },
  },
  '#af52de': {
    light: { bg: '#f6f3f9', fg: '#6940a5', border: 'rgba(105, 64, 165, 0.18)' },
    dark: { bg: '#331a50', fg: '#cba7f5', border: 'rgba(203, 167, 245, 0.22)' },
  },
  '#8b5cf6': {
    light: { bg: '#f6f3f9', fg: '#6940a5', border: 'rgba(105, 64, 165, 0.18)' },
    dark: { bg: '#331a50', fg: '#cba7f5', border: 'rgba(203, 167, 245, 0.22)' },
  },
  purple: {
    light: { bg: '#f6f3f9', fg: '#6940a5', border: 'rgba(105, 64, 165, 0.18)' },
    dark: { bg: '#331a50', fg: '#cba7f5', border: 'rgba(203, 167, 245, 0.22)' },
  },

  // Pink
  '#db2777': {
    light: { bg: '#faf1f5', fg: '#ad1a72', border: 'rgba(173, 26, 114, 0.18)' },
    dark: { bg: '#421630', fg: '#f494c7', border: 'rgba(244, 148, 199, 0.22)' },
  },
  '#ff2d55': {
    light: { bg: '#faf1f5', fg: '#ad1a72', border: 'rgba(173, 26, 114, 0.18)' },
    dark: { bg: '#421630', fg: '#f494c7', border: 'rgba(244, 148, 199, 0.22)' },
  },
  '#ec4899': {
    light: { bg: '#faf1f5', fg: '#ad1a72', border: 'rgba(173, 26, 114, 0.18)' },
    dark: { bg: '#421630', fg: '#f494c7', border: 'rgba(244, 148, 199, 0.22)' },
  },
  pink: {
    light: { bg: '#faf1f5', fg: '#ad1a72', border: 'rgba(173, 26, 114, 0.18)' },
    dark: { bg: '#421630', fg: '#f494c7', border: 'rgba(244, 148, 199, 0.22)' },
  },

  // Red
  '#dc2626': {
    light: { bg: '#fdebec', fg: '#c42828', border: 'rgba(196, 40, 40, 0.18)' },
    dark: { bg: '#451818', fg: '#f87171', border: 'rgba(248, 113, 113, 0.22)' },
  },
  '#ff3b30': {
    light: { bg: '#fdebec', fg: '#c42828', border: 'rgba(196, 40, 40, 0.18)' },
    dark: { bg: '#451818', fg: '#f87171', border: 'rgba(248, 113, 113, 0.22)' },
  },
  red: {
    light: { bg: '#fdebec', fg: '#c42828', border: 'rgba(196, 40, 40, 0.18)' },
    dark: { bg: '#451818', fg: '#f87171', border: 'rgba(248, 113, 113, 0.22)' },
  },

  // Orange
  '#ea580c': {
    light: { bg: '#faece4', fg: '#d95b1e', border: 'rgba(217, 91, 30, 0.18)' },
    dark: { bg: '#42240b', fg: '#ffa366', border: 'rgba(255, 163, 102, 0.22)' },
  },
  '#ff9500': {
    light: { bg: '#faece4', fg: '#d95b1e', border: 'rgba(217, 91, 30, 0.18)' },
    dark: { bg: '#42240b', fg: '#ffa366', border: 'rgba(255, 163, 102, 0.22)' },
  },
  '#f59e0b': {
    light: { bg: '#faece4', fg: '#d95b1e', border: 'rgba(217, 91, 30, 0.18)' },
    dark: { bg: '#42240b', fg: '#ffa366', border: 'rgba(255, 163, 102, 0.22)' },
  },
  orange: {
    light: { bg: '#faece4', fg: '#d95b1e', border: 'rgba(217, 91, 30, 0.18)' },
    dark: { bg: '#42240b', fg: '#ffa366', border: 'rgba(255, 163, 102, 0.22)' },
  },

  // Yellow
  '#ca8a04': {
    light: { bg: '#fbf3db', fg: '#b37e00', border: 'rgba(179, 126, 0, 0.20)' },
    dark: { bg: '#3a2e03', fg: '#fed156', border: 'rgba(254, 209, 86, 0.22)' },
  },
  '#eab308': {
    light: { bg: '#fbf3db', fg: '#b37e00', border: 'rgba(179, 126, 0, 0.20)' },
    dark: { bg: '#3a2e03', fg: '#fed156', border: 'rgba(254, 209, 86, 0.22)' },
  },
  yellow: {
    light: { bg: '#fbf3db', fg: '#b37e00', border: 'rgba(179, 126, 0, 0.20)' },
    dark: { bg: '#3a2e03', fg: '#fed156', border: 'rgba(254, 209, 86, 0.22)' },
  },

  // Green
  '#16a34a': {
    light: { bg: '#edf3ec', fg: '#2b7a4b', border: 'rgba(43, 122, 75, 0.18)' },
    dark: { bg: '#10301b', fg: '#72d997', border: 'rgba(114, 217, 151, 0.22)' },
  },
  '#34c759': {
    light: { bg: '#edf3ec', fg: '#2b7a4b', border: 'rgba(43, 122, 75, 0.18)' },
    dark: { bg: '#10301b', fg: '#72d997', border: 'rgba(114, 217, 151, 0.22)' },
  },
  '#10b981': {
    light: { bg: '#edf3ec', fg: '#2b7a4b', border: 'rgba(43, 122, 75, 0.18)' },
    dark: { bg: '#10301b', fg: '#72d997', border: 'rgba(114, 217, 151, 0.22)' },
  },
  green: {
    light: { bg: '#edf3ec', fg: '#2b7a4b', border: 'rgba(43, 122, 75, 0.18)' },
    dark: { bg: '#10301b', fg: '#72d997', border: 'rgba(114, 217, 151, 0.22)' },
  },

  // Teal / Cyan
  '#0d9488': {
    light: { bg: '#e6f6f4', fg: '#0d766e', border: 'rgba(13, 118, 110, 0.18)' },
    dark: { bg: '#0d332f', fg: '#5eead4', border: 'rgba(94, 234, 212, 0.22)' },
  },
  '#30b0c7': {
    light: { bg: '#e6f6f4', fg: '#0d766e', border: 'rgba(13, 118, 110, 0.18)' },
    dark: { bg: '#0d332f', fg: '#5eead4', border: 'rgba(94, 234, 212, 0.22)' },
  },
  '#06b6d4': {
    light: { bg: '#e6f6f4', fg: '#0d766e', border: 'rgba(13, 118, 110, 0.18)' },
    dark: { bg: '#0d332f', fg: '#5eead4', border: 'rgba(94, 234, 212, 0.22)' },
  },
  teal: {
    light: { bg: '#e6f6f4', fg: '#0d766e', border: 'rgba(13, 118, 110, 0.18)' },
    dark: { bg: '#0d332f', fg: '#5eead4', border: 'rgba(94, 234, 212, 0.22)' },
  },
  cyan: {
    light: { bg: '#e6f6f4', fg: '#0d766e', border: 'rgba(13, 118, 110, 0.18)' },
    dark: { bg: '#0d332f', fg: '#5eead4', border: 'rgba(94, 234, 212, 0.22)' },
  },

  // Indigo
  '#4f46e5': {
    light: { bg: '#eef2ff', fg: '#4338ca', border: 'rgba(67, 56, 202, 0.18)' },
    dark: { bg: '#1e1b4b', fg: '#a5b4fc', border: 'rgba(165, 180, 252, 0.22)' },
  },
  '#5856d6': {
    light: { bg: '#eef2ff', fg: '#4338ca', border: 'rgba(67, 56, 202, 0.18)' },
    dark: { bg: '#1e1b4b', fg: '#a5b4fc', border: 'rgba(165, 180, 252, 0.22)' },
  },
  '#6366f1': {
    light: { bg: '#eef2ff', fg: '#4338ca', border: 'rgba(67, 56, 202, 0.18)' },
    dark: { bg: '#1e1b4b', fg: '#a5b4fc', border: 'rgba(165, 180, 252, 0.22)' },
  },
  indigo: {
    light: { bg: '#eef2ff', fg: '#4338ca', border: 'rgba(67, 56, 202, 0.18)' },
    dark: { bg: '#1e1b4b', fg: '#a5b4fc', border: 'rgba(165, 180, 252, 0.22)' },
  },

  // Brand Deep Forest Emerald
  '#1f4d3d': {
    light: { bg: '#edf3ec', fg: '#1f4d3d', border: 'rgba(31, 77, 61, 0.20)' },
    dark: { bg: '#10301b', fg: '#6ee7b7', border: 'rgba(110, 231, 183, 0.22)' },
  },
};

// Helper to convert hex to HSL
function hexToHSL(hex: string): { h: number; s: number; l: number } {
  let cleanHex = hex.replace(/^#/, '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map((c) => c + c).join('');
  }
  const num = parseInt(cleanHex, 16);
  if (isNaN(num)) {
    return { h: 210, s: 70, l: 50 };
  }
  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function resolveOptionColor(hexColor?: string | null): OptionColorPair {
  if (!hexColor) {
    return PRESET_COLOR_MAP['#64748b'];
  }

  const normalized = hexColor.toLowerCase().trim();
  if (PRESET_COLOR_MAP[normalized]) {
    return PRESET_COLOR_MAP[normalized];
  }

  // Dynamic calculation for custom or arbitrary hex colors
  const { h, s } = hexToHSL(normalized);
  const safeSat = Math.max(35, Math.min(s, 80));

  return {
    light: {
      bg: `hsla(${h}, ${safeSat}%, 95%, 1)`,
      fg: `hsl(${h}, ${Math.min(safeSat + 10, 85)}%, 30%)`,
      border: `hsla(${h}, ${safeSat}%, 40%, 0.18)`,
    },
    dark: {
      bg: `hsla(${h}, ${safeSat}%, 15%, 1)`,
      fg: `hsl(${h}, ${Math.min(safeSat + 5, 85)}%, 75%)`,
      border: `hsla(${h}, ${safeSat}%, 70%, 0.22)`,
    },
  };
}

export function getOptionBadgeStyles(hexColor?: string | null) {
  const { light, dark } = resolveOptionColor(hexColor);
  return {
    style: {
      '--opt-bg': light.bg,
      '--opt-fg': light.fg,
      '--opt-border': light.border,
      '--opt-bg-dark': dark.bg,
      '--opt-fg-dark': dark.fg,
      '--opt-border-dark': dark.border,
    } as React.CSSProperties,
    className: 'option-badge',
  };
}

export function getOptionTextStyles(hexColor?: string | null) {
  const { light, dark } = resolveOptionColor(hexColor);
  return {
    style: {
      '--opt-fg': light.fg,
      '--opt-fg-dark': dark.fg,
    } as React.CSSProperties,
    className: 'option-text',
  };
}
