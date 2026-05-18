export const colors = {
  white: '#FFFFFF',
  background: '#F8F7F5',
  surface: '#FFFFFF',
  surfaceAlt: '#F0EFED',

  accent: '#2C2C2C',
  accentSoft: '#4A4A4A',

  textPrimary: '#1C1C1E',
  textSecondary: '#6C6C70',
  textMuted: '#AEAEB2',

  // Tag colors
  tag: {
    tops: '#D4E8D0',
    topsText: '#2D5A27',
    bottoms: '#D0D8E8',
    bottomsText: '#1E3A6E',
    outerwear: '#E8DDD0',
    outerwearText: '#5A3E2B',
    shoes: '#E8D0D8',
    shoesText: '#6E1E3A',
    accessories: '#E8E8D0',
    accessoriesText: '#5A5A1E',
    dresses: '#DDD0E8',
    dressesText: '#3E1E6E',
    default: '#E0E0E0',
    defaultText: '#4A4A4A',
  },

  // Status colors
  status: {
    success: '#34C759',
    successLight: '#D4F5DC',
    warning: '#FF9500',
    warningLight: '#FFF3D4',
    error: '#FF3B30',
    errorLight: '#FFD4D2',
    info: '#007AFF',
    infoLight: '#D4E8FF',
  },

  border: '#E5E5EA',
  overlay: 'rgba(0, 0, 0, 0.5)',
} as const;

export type Colors = typeof colors;
