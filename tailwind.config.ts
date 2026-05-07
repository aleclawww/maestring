import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── v2 theme: Corporate Trust (scoped under .theme-v2) ──
        v2: {
          background: 'var(--v2-background)',
          surface: 'var(--v2-surface)',
          'surface-subtle': 'var(--v2-surface-subtle)',
          'surface-sunken': 'var(--v2-surface-sunken)',
          foreground: 'var(--v2-foreground)',
          'foreground-muted': 'var(--v2-foreground-muted)',
          'foreground-subtle': 'var(--v2-foreground-subtle)',
          border: 'var(--v2-border)',
          'border-strong': 'var(--v2-border-strong)',
          'border-subtle': 'var(--v2-border-subtle)',
          // Brand (indigo)
          brand: 'var(--v2-brand)',
          'brand-hover': 'var(--v2-brand-hover)',
          'brand-soft': 'var(--v2-brand-soft)',
          'brand-soft-2': 'var(--v2-brand-soft-2)',
          'brand-foreground': 'var(--v2-brand-foreground)',
          // Accent (violet, gradient partner)
          accent: 'var(--v2-accent)',
          'accent-soft': 'var(--v2-accent-soft)',
          'accent-soft-2': 'var(--v2-accent-soft-2)',
          // Deep (final CTA)
          deep: 'var(--v2-deep)',
          'deep-darker': 'var(--v2-deep-darker)',
          'deep-foreground': 'var(--v2-deep-foreground)',
          // Semantic
          success: 'var(--v2-success)',
          'success-soft': 'var(--v2-success-soft)',
          warning: 'var(--v2-warning)',
          'warning-soft': 'var(--v2-warning-soft)',
          error: 'var(--v2-error)',
          'error-soft': 'var(--v2-error-soft)',
        },
        // ── legacy dark theme (do not touch) ──
        background: '#0f1117',
        surface: '#161b27',
        'surface-2': '#1e2535',
        border: '#2a3244',
        primary: {
          DEFAULT: '#6366f1',
          hover: '#4f52d8',
          light: '#818cf8',
          '50': '#eef2ff',
          '100': '#e0e7ff',
          '200': '#c7d2fe',
          '500': '#6366f1',
          '600': '#4f46e5',
          '700': '#4338ca',
        },
        success: {
          DEFAULT: '#10b981',
          light: '#34d399',
          dark: '#059669',
        },
        danger: {
          DEFAULT: '#ef4444',
          light: '#f87171',
          dark: '#dc2626',
        },
        warning: {
          DEFAULT: '#f59e0b',
          light: '#fbbf24',
          dark: '#d97706',
        },
        muted: {
          DEFAULT: '#64748b',
          foreground: '#94a3b8',
        },
        text: {
          primary: '#f1f5f9',
          secondary: '#94a3b8',
          muted: '#64748b',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'monospace'],
        // v2 ramps
        'v2-display': ['var(--font-jakarta)', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        'v2-body': ['var(--font-jakarta)', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        'v2-mono': ['var(--font-jetbrains)', 'JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      letterSpacing: {
        'v2-display': '-0.02em',
        'v2-tight': '-0.01em',
        'v2-wide': '0.08em',
      },
      transitionTimingFunction: {
        'v2': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'fade-in-up': 'fadeInUp 0.4s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        shimmer: 'shimmer 1.5s infinite',
        confetti: 'confetti 0.8s ease-out forwards',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'score-ring': 'scoreRing 1s ease-out forwards',
        'bounce-soft': 'bounceSoft 0.6s ease-out',
        float: 'float 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        confetti: {
          '0%': { transform: 'scale(0.8) rotate(-5deg)', opacity: '0' },
          '50%': { transform: 'scale(1.1) rotate(2deg)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
        },
        scoreRing: {
          '0%': { strokeDashoffset: '283' },
          '100%': { strokeDashoffset: 'var(--ring-offset)' },
        },
        bounceSoft: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'hero-gradient': 'linear-gradient(135deg, #0f1117 0%, #161b27 50%, #1a1f35 100%)',
        'card-gradient': 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)',
        shimmer: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.05) 50%, transparent 100%)',
        // v2 — Corporate Trust gradients
        'v2-gradient-brand': 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
        'v2-gradient-brand-soft': 'linear-gradient(135deg, #E0E7FF 0%, #EDE9FE 100%)',
        'v2-gradient-deep': 'linear-gradient(135deg, #312E81 0%, #1E1B4B 100%)',
      },
      boxShadow: {
        glow: '0 0 20px rgba(99, 102, 241, 0.3)',
        'glow-success': '0 0 20px rgba(16, 185, 129, 0.3)',
        'glow-danger': '0 0 20px rgba(239, 68, 68, 0.3)',
        card: '0 4px 24px rgba(0, 0, 0, 0.3)',
        'card-hover': '0 8px 32px rgba(0, 0, 0, 0.4)',
        // v2 — Corporate Trust colored shadows
        'v2-soft': '0 4px 20px -2px rgba(79, 70, 229, 0.10)',
        'v2-elevated':
          '0 10px 25px -5px rgba(79, 70, 229, 0.15), 0 8px 10px -6px rgba(79, 70, 229, 0.10)',
        'v2-button': '0 4px 14px 0 rgba(79, 70, 229, 0.30)',
        'v2-glow': '0 0 20px rgba(79, 70, 229, 0.50)',
        'v2-modal': '0 24px 48px -12px rgba(15, 23, 42, 0.18)',
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}

export default config
