/**
 * Design tokens from UI-kit
 * Use these in Tailwind config and components
 */

export const colors = {
  accent: '#5357D9',
  text: '#182137',
  secondary: '#707B91',
  page: '#F6F7FB',
  surface: '#FFFFFF',
  border: '#E3E7F0',
  'accent-soft': '#EEEDFF',
  success: '#218166',
  'success-soft': '#E7F5EE',
  warning: '#A66B17',
  danger: '#C24A56',
  'danger-soft': '#FCEEF0',
} as const;

export type ColorToken = keyof typeof colors;

/** Focus ring color with opacity */
export const focusRing = 'rgba(83, 87, 217, 0.33)'; // #5357D933
