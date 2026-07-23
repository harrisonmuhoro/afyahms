import type { Config } from 'tailwindcss';
import forms from '@tailwindcss/forms';
import containerQueries from '@tailwindcss/container-queries';

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#F0FDFA',
          100: '#CCFBF1',
          200: '#99F6E4',
          300: '#5EEAD4',
          400: '#2DD4BF',
          500: '#14B8A6',
          600: '#0D9488',
          700: '#0F766E',
          800: '#115E59',
          900: '#134E4A',
          950: '#042F2E',
        },
        clinical: {
          triage_red:    '#DC2626',
          triage_orange: '#EA580C',
          triage_yellow: '#CA8A04',
          triage_green:  '#16A34A',
          triage_blue:   '#2563EB',
          critical:      '#B91C1C',
          warning:       '#D97706',
          info:          '#0284C7',
        },
        // Design System Colors
        "surface-bright": "#f5faf8",
        "tertiary": "#525e5c",
        "surface-tint": "#006a61",
        "primary-container": "#008378",
        "inverse-on-surface": "#edf2f0",
        "inverse-primary": "#6bd8cb",
        "secondary-container": "#6df5e1",
        "background": "#f5faf8",
        "on-tertiary-container": "#f3fffc",
        "on-surface": "#171d1c",
        "on-secondary-container": "#006f64",
        "on-primary-fixed-variant": "#005049",
        "inverse-surface": "#2c3130",
        "on-background": "#171d1c",
        "tertiary-container": "#6b7775",
        "surface-container": "#eaefed",
        "secondary": "#006b5f",
        "on-error": "#ffffff",
        "error": "#ba1a1a",
        "surface-container-low": "#f0f5f2",
        "surface-variant": "#dee4e1",
        "on-tertiary-fixed-variant": "#3d4947",
        "tertiary-fixed": "#d8e5e2",
        "secondary-fixed": "#71f8e4",
        "surface": "#f5faf8",
        "on-secondary-fixed": "#00201c",
        "on-surface-variant": "#3d4947",
        "on-primary-fixed": "#00201d",
        "on-tertiary-fixed": "#121e1c",
        "primary-fixed": "#89f5e7",
        "surface-container-highest": "#dee4e1",
        "outline": "#6d7a77",
        "surface-container-lowest": "#ffffff",
        "on-primary": "#ffffff",
        "primary-fixed-dim": "#6bd8cb",
        "primary": "#00685f",
        "on-primary-container": "#f4fffc",
        "outline-variant": "#bcc9c6",
        "on-error-container": "#93000a",
        "surface-container-high": "#e4e9e7",
        "on-secondary": "#ffffff",
        "error-container": "#ffdad6",
        "on-tertiary": "#ffffff",
        "tertiary-fixed-dim": "#bcc9c6",
        "on-secondary-fixed-variant": "#005048",
        "secondary-fixed-dim": "#4fdbc8",
        "surface-dim": "#d6dbd9"
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
        "body-sm": ["Inter"],
        "body-md": ["Inter"],
        "headline-lg": ["Inter"],
        "headline-md": ["Inter"],
        "data-mono": ["JetBrains Mono"],
        "label-caps": ["Inter"]
      },
      fontSize: {
        "body-sm": ["13px", {"lineHeight": "18px", "fontWeight": "400"}],
        "body-md": ["14px", {"lineHeight": "20px", "fontWeight": "400"}],
        "headline-lg": ["24px", {"lineHeight": "32px", "letterSpacing": "-0.02em", "fontWeight": "600"}],
        "headline-md": ["18px", {"lineHeight": "24px", "letterSpacing": "-0.01em", "fontWeight": "600"}],
        "data-mono": ["13px", {"lineHeight": "18px", "fontWeight": "500"}],
        "label-caps": ["12px", {"lineHeight": "16px", "letterSpacing": "0.05em", "fontWeight": "600"}]
      },
      spacing: {
        "md": "16px",
        "gutter": "16px",
        "base": "4px",
        "xs": "8px",
        "xl": "32px",
        "sm": "12px",
        "lg": "24px",
        "container-margin": "24px"
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "2xl": "1.125rem",
        "full": "9999px"
      },
      boxShadow: {
        // Soft, low-contrast elevations for a calm clinical surface.
        card: '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)',
        'card-hover': '0 4px 12px -2px rgb(15 23 42 / 0.10), 0 2px 6px -2px rgb(15 23 42 / 0.06)',
        focus: '0 0 0 3px rgb(20 184 166 / 0.25)',
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in':  'slide-in 200ms ease-out',
        'fade-in':   'fade-in 200ms ease-out',
      },
      keyframes: {
        'slide-in': {
          '0%': { transform: 'translateY(-8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [
    forms,
    containerQueries,
  ],
};

export default config;