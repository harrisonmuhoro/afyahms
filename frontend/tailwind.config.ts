import type { Config } from 'tailwindcss';
import forms from '@tailwindcss/forms';
import containerQueries from '@tailwindcss/container-queries';

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // AfyaHMS semantic tokens — values live in index.css as CSS variables so
        // light and dark themes swap by mapping, never by component overrides.
        canvas: 'rgb(var(--afya-bg) / <alpha-value>)',
        surface: {
          DEFAULT: 'rgb(var(--afya-surface) / <alpha-value>)',
          muted: 'rgb(var(--afya-surface-muted) / <alpha-value>)',
          sunken: 'rgb(var(--afya-surface-sunken) / <alpha-value>)',
        },
        line: {
          DEFAULT: 'rgb(var(--afya-border) / <alpha-value>)',
          strong: 'rgb(var(--afya-border-strong) / <alpha-value>)',
        },
        ink: {
          DEFAULT: 'rgb(var(--afya-text) / <alpha-value>)',
          secondary: 'rgb(var(--afya-text-secondary) / <alpha-value>)',
          muted: 'rgb(var(--afya-text-muted) / <alpha-value>)',
        },
        primary: {
          DEFAULT: 'rgb(var(--afya-primary) / <alpha-value>)',
          hover: 'rgb(var(--afya-primary-hover) / <alpha-value>)',
          soft: 'rgb(var(--afya-primary-soft) / <alpha-value>)',
          fg: 'rgb(var(--afya-primary-fg) / <alpha-value>)',
          600: 'rgb(var(--afya-primary-hover) / <alpha-value>)',
        },
        success: { DEFAULT: 'rgb(var(--afya-success) / <alpha-value>)', soft: 'rgb(var(--afya-success-soft) / <alpha-value>)' },
        warning: { DEFAULT: 'rgb(var(--afya-warning) / <alpha-value>)', soft: 'rgb(var(--afya-warning-soft) / <alpha-value>)' },
        danger: { DEFAULT: 'rgb(var(--afya-danger) / <alpha-value>)', soft: 'rgb(var(--afya-danger-soft) / <alpha-value>)' },
        info: { DEFAULT: 'rgb(var(--afya-info) / <alpha-value>)', soft: 'rgb(var(--afya-info-soft) / <alpha-value>)' },

        // Neutral ramp shared by legacy `stone-*` utilities and the tokens above.
        stone: {
          50: '#F7F6F3', 100: '#EFEEEA', 200: '#E3E1DC', 300: '#CBC8C2', 400: '#9A9A96',
          500: '#707473', 600: '#535858', 700: '#3D4243', 800: '#2A2F31', 900: '#1C2022', 950: '#131618',
        },
        brand: {
          50: '#EEF7F6', 100: '#D5ECEA', 200: '#ABD8D5', 300: '#78BFBB', 400: '#4AA39F', 500: '#2A8A87',
          600: '#0E6E70', 700: '#0B5A5C', 800: '#0C4849', 900: '#0D3B3C', 950: '#062324',
        },
        clinical: {
          triage_red: '#C62828',
          triage_orange: '#E65100',
          triage_yellow: '#C79100',
          triage_green: '#2E7D32',
          triage_blue: '#1565C0',
          critical: 'rgb(var(--afya-danger) / <alpha-value>)',
          warning: 'rgb(var(--afya-warning) / <alpha-value>)',
          info: 'rgb(var(--afya-info) / <alpha-value>)',
        },

        // Legacy Material-style aliases, mapped onto the AfyaHMS tokens so older
        // screens inherit the same palette (and dark mode) without per-file edits.
        'surface-bright': 'rgb(var(--afya-bg) / <alpha-value>)',
        background: 'rgb(var(--afya-bg) / <alpha-value>)',
        'on-background': 'rgb(var(--afya-text) / <alpha-value>)',
        'surface-dim': 'rgb(var(--afya-surface-sunken) / <alpha-value>)',
        'surface-tint': 'rgb(var(--afya-primary) / <alpha-value>)',
        'surface-variant': 'rgb(var(--afya-surface-sunken) / <alpha-value>)',
        'surface-container-lowest': 'rgb(var(--afya-surface) / <alpha-value>)',
        'surface-container-low': 'rgb(var(--afya-surface-muted) / <alpha-value>)',
        'surface-container': 'rgb(var(--afya-surface-muted) / <alpha-value>)',
        'surface-container-high': 'rgb(var(--afya-surface-sunken) / <alpha-value>)',
        'surface-container-highest': 'rgb(var(--afya-surface-sunken) / <alpha-value>)',
        'on-surface': 'rgb(var(--afya-text) / <alpha-value>)',
        'on-surface-variant': 'rgb(var(--afya-text-secondary) / <alpha-value>)',
        outline: 'rgb(var(--afya-text-muted) / <alpha-value>)',
        'outline-variant': 'rgb(var(--afya-border) / <alpha-value>)',
        'inverse-surface': 'rgb(var(--afya-inverse) / <alpha-value>)',
        'inverse-on-surface': 'rgb(var(--afya-inverse-fg) / <alpha-value>)',
        'inverse-primary': 'rgb(var(--afya-primary-soft) / <alpha-value>)',
        'on-primary': 'rgb(var(--afya-primary-fg) / <alpha-value>)',
        'primary-container': 'rgb(var(--afya-primary) / <alpha-value>)',
        'on-primary-container': 'rgb(var(--afya-primary-fg) / <alpha-value>)',
        'primary-fixed': 'rgb(var(--afya-primary-soft) / <alpha-value>)',
        'primary-fixed-dim': 'rgb(var(--afya-primary-soft) / <alpha-value>)',
        'on-primary-fixed': 'rgb(var(--afya-primary-hover) / <alpha-value>)',
        'on-primary-fixed-variant': 'rgb(var(--afya-primary-hover) / <alpha-value>)',
        secondary: 'rgb(var(--afya-primary-hover) / <alpha-value>)',
        'on-secondary': 'rgb(var(--afya-primary-fg) / <alpha-value>)',
        'secondary-container': 'rgb(var(--afya-primary-soft) / <alpha-value>)',
        'on-secondary-container': 'rgb(var(--afya-primary) / <alpha-value>)',
        'secondary-fixed': 'rgb(var(--afya-primary-soft) / <alpha-value>)',
        'secondary-fixed-dim': 'rgb(var(--afya-primary-soft) / <alpha-value>)',
        'on-secondary-fixed': 'rgb(var(--afya-primary-hover) / <alpha-value>)',
        'on-secondary-fixed-variant': 'rgb(var(--afya-primary-hover) / <alpha-value>)',
        tertiary: 'rgb(var(--afya-text-muted) / <alpha-value>)',
        'on-tertiary': 'rgb(var(--afya-surface) / <alpha-value>)',
        'tertiary-container': 'rgb(var(--afya-text-muted) / <alpha-value>)',
        'on-tertiary-container': 'rgb(var(--afya-surface) / <alpha-value>)',
        'tertiary-fixed': 'rgb(var(--afya-surface-sunken) / <alpha-value>)',
        'tertiary-fixed-dim': 'rgb(var(--afya-border-strong) / <alpha-value>)',
        'on-tertiary-fixed': 'rgb(var(--afya-text) / <alpha-value>)',
        'on-tertiary-fixed-variant': 'rgb(var(--afya-text-secondary) / <alpha-value>)',
        error: 'rgb(var(--afya-danger) / <alpha-value>)',
        'on-error': 'rgb(var(--afya-primary-fg) / <alpha-value>)',
        'error-container': 'rgb(var(--afya-danger-soft) / <alpha-value>)',
        'on-error-container': 'rgb(var(--afya-danger) / <alpha-value>)',
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
        DEFAULT: '0.375rem',
        md: '0.5rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '0.875rem',
        '3xl': '1rem',
        full: '9999px',
      },
      boxShadow: {
        // Soft, low-contrast elevations for a calm clinical surface.
        card: '0 1px 2px 0 rgb(28 32 34 / 0.04)',
        'card-hover': '0 2px 8px -2px rgb(28 32 34 / 0.08)',
        overlay: '0 12px 32px -8px rgb(28 32 34 / 0.18), 0 2px 6px -2px rgb(28 32 34 / 0.08)',
        focus: '0 0 0 3px rgb(var(--afya-primary) / 0.25)',
        sm: '0 1px 2px 0 rgb(28 32 34 / 0.05)',
        md: '0 2px 6px -1px rgb(28 32 34 / 0.08)',
        lg: '0 8px 20px -6px rgb(28 32 34 / 0.12)',
        xl: '0 12px 32px -8px rgb(28 32 34 / 0.16)',
        '2xl': '0 16px 40px -12px rgb(28 32 34 / 0.2)',
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