import type { Config } from 'tailwindcss';
import { colors } from './src/shared/config/colors';

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/widgets/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
    './src/entities/**/*.{js,ts,jsx,tsx,mdx}',
    './src/shared/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        accent: colors.accent,
        text: colors.text,
        secondary: colors.secondary,
        page: colors.page,
        surface: colors.surface,
        border: colors.border,
        'accent-soft': colors['accent-soft'],
        success: colors.success,
        'success-soft': colors['success-soft'],
        warning: colors.warning,
        danger: colors.danger,
        'danger-soft': colors['danger-soft'],
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // From UI-kit typography scale (size / line-height)
        hero: ['60px', { lineHeight: '90px', fontWeight: '700' }],
        h1: ['36px', { lineHeight: '54px', fontWeight: '700' }],
        h2: ['32px', { lineHeight: '48px', fontWeight: '700' }],
        h3: ['25px', { lineHeight: '37.5px', fontWeight: '700' }],
        h4: ['21px', { lineHeight: '31.5px', fontWeight: '400' }],
        'section': ['18px', { lineHeight: '27px', fontWeight: '600' }],
        body: ['14px', { lineHeight: '21px', fontWeight: '400' }],
        label: ['13px', { lineHeight: '19.5px', fontWeight: '600' }],
        helper: ['12px', { lineHeight: '18px', fontWeight: '400' }],
        caption: ['11px', { lineHeight: '16.5px', fontWeight: '700' }],
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '18px',
      },
      spacing: {
        // Common rhythm from kit
        '4.5': '18px',
        '13': '52px',
      },
      boxShadow: {
        soft: '0 4px 10px rgba(24, 33, 55, 0.04)',
        card: '0 4px 10px rgba(24, 33, 55, 0.04)',
      },
      height: {
        btn: '44px',
        input: '48px',
        nav: '46px',
      },
    },
  },
  plugins: [],
};

export default config;
